/*
  ESP32 Medicine Box Alarm Firmware (NTP Time Sync + Firebase Schedule Version)
  
  Hardware:
    - ESP32 Dev Board
    - Magnetic Reed Switch (Pin 4, INPUT_PULLUP)
    - Active Buzzer via 2N2222 (Pin 23, HIGH = ON)
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "time.h"

// ==========================================
// CONFIGURATION (Configured for Ranusha)
// ==========================================

// Wi-Fi Credentials
#define WIFI_SSID           "myhotspot"
#define WIFI_PASS           "11111111"

// Firebase Settings
#define FIREBASE_URL        "https://medalert-cc6a7-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_SECRET     "HUJkU4ZR6YlOEiiNuKISiOcabilrVbRL6mGYshOZ"

// Time Zone Settings (GMT +5:30 for India/Sri Lanka)
const long GMT_OFFSET_SEC     = 19800; // 5.5 hours * 3600 = 19800 seconds
const int DAYLIGHT_OFFSET_SEC = 0;     // No daylight savings

// Pin Definitions
#define REED_PIN            4    // LOW = magnet near (box CLOSED), HIGH = magnet far (box OPEN)
#define BUZZER_PIN          23   // Active buzzer: HIGH = ON, LOW = OFF

// Dynamic Alarm Times (Default fallbacks, overwritten by Firebase)
int alarmHours[3]   = {8, 12, 20};
int alarmMinutes[3] = {0, 0, 0};

// State Machine Settings
const unsigned long BUZZ_DURATION   = 60000;   // 1 minute (60,000 ms)
const unsigned long SNOOZE_DURATION = 300000;  // 5 minutes (300,000 ms)
const int MAX_SNOOZES               = 2;       // Max 2 snoozes (total 3 buzz cycles)

// ==========================================
// SYSTEM STATE VARIABLES
// ==========================================

enum AlarmState {
  STATE_IDLE,
  STATE_BUZZING,
  STATE_SNOOZING
};

AlarmState alarmState = STATE_IDLE;
int activeAlarmIndex  = -1;
int buzzCount         = 0;
unsigned long stateTimerStart = 0;

bool alarmTriggeredToday[3] = {false, false, false};
int lastResetDay            = -1;
bool manualSnoozeTriggered  = false;
bool lastBoxState           = false; // true = open, false = closed
int missedDoseCount         = 0;

unsigned long lastFirebaseCheck = 0;
unsigned long lastAlarmFetch    = 0;
unsigned long lastSerialPrint   = 0;

// Device Instances
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

String formatTime(struct tm timeinfo) {
  char timeStringBuff[30];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%I:%M:%S %p", &timeinfo);
  return String(timeStringBuff);
}

void updateFirebaseString(const char* path, String val) {
  if (Firebase.ready()) {
    Firebase.RTDB.setString(&fbdo, path, val);
  }
}

void updateFirebaseBool(const char* path, bool val) {
  if (Firebase.ready()) {
    Firebase.RTDB.setBool(&fbdo, path, val);
  }
}

void updateFirebaseInt(const char* path, int val) {
  if (Firebase.ready()) {
    Firebase.RTDB.setInt(&fbdo, path, val);
  }
}

// Pull schedules from Firebase (slot0, slot1, slot2)
void fetchFirebaseAlarms() {
  if (millis() - lastAlarmFetch < 10000 && lastAlarmFetch != 0) return;
  lastAlarmFetch = millis();
  
  if (Firebase.ready()) {
    Serial.println("[Firebase] Checking for alarm schedule updates...");
    
    // Use a single GET request for the entire alarms node instead of 15 individual requests
    if (Firebase.RTDB.getJSON(&fbdo, "/medicineBox/alarms")) {
      FirebaseJsonData result;
      for (int i = 0; i < 3; i++) {
        String base = "slot" + String(i);
        int valHour = -1;
        int valMin = -1;
        
        fbdo.jsonObject().get(result, base + "/hour");
        if (result.success) valHour = result.intValue;
        
        fbdo.jsonObject().get(result, base + "/minute");
        if (result.success) valMin = result.intValue;

        if (alarmHours[i] != valHour || alarmMinutes[i] != valMin) {
          alarmHours[i] = valHour;
          alarmMinutes[i] = valMin;
          alarmTriggeredToday[i] = false;
          if (valHour == -1) {
            Serial.printf("[Scheduler] Alarm slot %d disabled\n", i + 1);
          } else {
            Serial.printf("[Scheduler] Alarm slot %d updated to %02d:%02d\n", i + 1, valHour, valMin);
          }
        }
      }
      Serial.println("[Firebase] Schedules synced successfully.");
    } else {
      Serial.printf("[Firebase] Sync failed: %s\n", fbdo.errorReason().c_str());
    }
  }
}

// Poll Firebase for manualSnooze variable
void checkFirebaseSnooze() {
  if (millis() - lastFirebaseCheck < 1000) return; 
  lastFirebaseCheck = millis();
  
  if (Firebase.ready()) {
    if (Firebase.RTDB.getBool(&fbdo, "/medicineBox/manualSnooze")) {
      if (fbdo.dataType() == "boolean" && fbdo.boolData() == true) {
        Serial.println("[Firebase] Manual snooze command received!");
        manualSnoozeTriggered = true;
        Firebase.RTDB.setBool(&fbdo, "/medicineBox/manualSnooze", false);
      }
    }
  }
}

void WiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.printf("[Wi-Fi] Disconnected! Reason: %d\n", info.wifi_sta_disconnected.reason);
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("[Wi-Fi] Got IP: %s\n", IPAddress(info.got_ip.ip_info.ip.addr).toString().c_str());
      break;
    default:
      break;
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1500);
  
  WiFi.onEvent(WiFiEvent);

  Serial.println("\n========================================");
  Serial.println("   Smart Medicine Box Setup (NTP)");
  Serial.println("========================================");

  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); // Ensure buzzer is off at boot

  Serial.printf("\n[Wi-Fi] Connecting to: %s\n", WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true); // 'true' clears any saved buggy credentials
  delay(1000);           // Give the Wi-Fi chip a full second to reset
  
  WiFi.setSleep(false);  // Disable sleep mode, which fixes many mobile hotspot issues
  WiFi.setAutoReconnect(true); // Automatically try to reconnect if the hotspot kicks it out
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[Wi-Fi] Connected!");

  Serial.println("[NTP] Syncing time with server pool.ntp.org...");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, "pool.ntp.org");

  // Wait for NTP time sync to complete before initializing Firebase
  struct tm timeinfo;
  Serial.print("[NTP] Awaiting time sync");
  while (!getLocalTime(&timeinfo)) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[NTP] Time synchronized successfully!");
  Serial.print("[NTP] Current Local Time: ");
  Serial.println(formatTime(timeinfo));

  Serial.println("[Firebase] Configuring database client...");
  config.database_url = FIREBASE_URL;
  config.signer.tokens.legacy_token = FIREBASE_SECRET;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true); 

  delay(1000);
  fetchFirebaseAlarms();

  lastBoxState = (digitalRead(REED_PIN) == HIGH);
  updateFirebaseString("/medicineBox/boxStatus", lastBoxState ? "open" : "closed");
  updateFirebaseString("/medicineBox/alarmState", "BOOT");
  updateFirebaseBool("/medicineBox/buzzerStatus", false);
  updateFirebaseInt("/medicineBox/missedDoseCount", missedDoseCount);

  Serial.println("[System] Setup complete. System Running.\n");
}

// ==========================================
// LOOP STATE MACHINE
// ==========================================
void loop() {
  struct tm timeinfo;
  bool timeSyncSuccess = getLocalTime(&timeinfo);

  if (!timeSyncSuccess) {
    if (millis() - lastSerialPrint >= 5000) {
      lastSerialPrint = millis();
      Serial.println("[System] Awaiting internet time sync (NTP)...");
    }
    digitalWrite(BUZZER_PIN, LOW); 
    return; 
  }

  bool boxOpen = (digitalRead(REED_PIN) == HIGH);
  if (boxOpen != lastBoxState) {
    lastBoxState = boxOpen;
    Serial.printf("[Sensor] Lid opened state changed to: %s\n", boxOpen ? "OPEN" : "CLOSED");
    updateFirebaseString("/medicineBox/boxStatus", boxOpen ? "open" : "closed");
  }

  fetchFirebaseAlarms();
  checkFirebaseSnooze();

  if (timeinfo.tm_mday != lastResetDay) {
    lastResetDay = timeinfo.tm_mday;
    for (int i = 0; i < 3; i++) {
      alarmTriggeredToday[i] = false;
    }
    Serial.println("[System] Day changed. Alarm scheduler flags reset.");
  }

  switch (alarmState) {
    case STATE_IDLE:
      digitalWrite(BUZZER_PIN, LOW); 
      
      for (int i = 0; i < 3; i++) {
        // Only trigger if alarm is not disabled (-1)
        if (alarmHours[i] != -1 && timeinfo.tm_hour == alarmHours[i] && timeinfo.tm_min == alarmMinutes[i] && !alarmTriggeredToday[i]) {
          alarmTriggeredToday[i] = true;
          
          if (boxOpen) {
            Serial.printf("[Scheduler] Slot %d triggered but box already OPEN. Dose recorded.\n", i + 1);
            String logMsg = formatTime(timeinfo) + " (Early/Open)";
            updateFirebaseString("/medicineBox/lastDoseTaken", logMsg);
          } else {
            Serial.printf("[Scheduler] Slot %d alarm active!\n", i + 1);
            alarmState = STATE_BUZZING;
            activeAlarmIndex = i;
            buzzCount = 1;
            stateTimerStart = millis();
            
            digitalWrite(BUZZER_PIN, HIGH);
            updateFirebaseString("/medicineBox/alarmState", "BUZZING");
            updateFirebaseBool("/medicineBox/buzzerStatus", true);
          }
        }
      }
      break;

    case STATE_BUZZING:
      digitalWrite(BUZZER_PIN, HIGH); 
      
      if (boxOpen) {
        Serial.println("[Alarm] Lid opened! Silencing buzzer and ending alarm.");
        digitalWrite(BUZZER_PIN, LOW);
        alarmState = STATE_IDLE;
        
        String logMsg = formatTime(timeinfo) + " (Slot " + String(activeAlarmIndex + 1) + ")";
        updateFirebaseString("/medicineBox/lastDoseTaken", logMsg);
        updateFirebaseString("/medicineBox/alarmState", "IDLE");
        updateFirebaseBool("/medicineBox/buzzerStatus", false);
        manualSnoozeTriggered = false;
      } 
      else if (manualSnoozeTriggered) {
        manualSnoozeTriggered = false;
        digitalWrite(BUZZER_PIN, LOW);
        
        if (buzzCount <= MAX_SNOOZES) { 
          Serial.printf("[Alarm] Manual snooze activated (Buzz count: %d/%d). Snoozing for 5 minutes.\n", buzzCount, MAX_SNOOZES + 1);
          alarmState = STATE_SNOOZING;
          buzzCount++;
          stateTimerStart = millis();
          
          updateFirebaseString("/medicineBox/alarmState", "SNOOZING");
          updateFirebaseBool("/medicineBox/buzzerStatus", false);
        } else { 
          Serial.println("[Alarm] Out of snoozes. Ending alarm cycle as MISSED.");
          alarmState = STATE_IDLE;
          missedDoseCount++;
          
          updateFirebaseInt("/medicineBox/missedDoseCount", missedDoseCount);
          updateFirebaseString("/medicineBox/alarmState", "IDLE");
          updateFirebaseBool("/medicineBox/buzzerStatus", false);
        }
      }
      else if (millis() - stateTimerStart >= BUZZ_DURATION) {
        digitalWrite(BUZZER_PIN, LOW);
        
        if (buzzCount <= MAX_SNOOZES) {
          Serial.printf("[Alarm] Time limit reached (Buzz count: %d/%d). Auto-snoozing for 5 minutes.\n", buzzCount, MAX_SNOOZES + 1);
          alarmState = STATE_SNOOZING;
          buzzCount++;
          stateTimerStart = millis();
          
          updateFirebaseString("/medicineBox/alarmState", "SNOOZING");
          updateFirebaseBool("/medicineBox/buzzerStatus", false);
        } else {
          Serial.println("[Alarm] 3 buzz cycles completed with no response. Dose MISSED.");
          alarmState = STATE_IDLE;
          missedDoseCount++;
          
          updateFirebaseInt("/medicineBox/missedDoseCount", missedDoseCount);
          updateFirebaseString("/medicineBox/alarmState", "IDLE");
          updateFirebaseBool("/medicineBox/buzzerStatus", false);
        }
      }
      break;

    case STATE_SNOOZING:
      digitalWrite(BUZZER_PIN, LOW); 
      
      if (boxOpen) {
        Serial.println("[Snooze] Lid opened during snooze! Resetting to IDLE.");
        alarmState = STATE_IDLE;
        
        String logMsg = formatTime(timeinfo) + " (Slot " + String(activeAlarmIndex + 1) + " during snooze)";
        updateFirebaseString("/medicineBox/lastDoseTaken", logMsg);
        updateFirebaseString("/medicineBox/alarmState", "IDLE");
        manualSnoozeTriggered = false;
      }
      else if (manualSnoozeTriggered) {
        manualSnoozeTriggered = false;
        Serial.println("[Snooze] Manual snooze triggered again. Resetting 5-minute snooze timer.");
        stateTimerStart = millis();
      }
      else if (millis() - stateTimerStart >= SNOOZE_DURATION) {
        Serial.printf("[Snooze] Snooze elapsed. Resuming alarm buzz session (%d/%d).\n", buzzCount, MAX_SNOOZES + 1);
        alarmState = STATE_BUZZING;
        stateTimerStart = millis();
        
        digitalWrite(BUZZER_PIN, HIGH);
        updateFirebaseString("/medicineBox/alarmState", "BUZZING");
        updateFirebaseBool("/medicineBox/buzzerStatus", true);
      }
      break;
  }

  if (millis() - lastSerialPrint >= 5000) {
    lastSerialPrint = millis();
    Serial.print("[INFO] Local Time: ");
    Serial.print(formatTime(timeinfo));
    Serial.print(" | Lid: ");
    Serial.print(boxOpen ? "OPEN" : "CLOSED");
    Serial.print(" | State: ");
    switch(alarmState) {
      case STATE_IDLE: Serial.print("IDLE"); break;
      case STATE_BUZZING: Serial.printf("BUZZING (Cycle %d/%d)", buzzCount, MAX_SNOOZES + 1); break;
      case STATE_SNOOZING: Serial.printf("SNOOZING (Cycle %d/%d)", buzzCount - 1, MAX_SNOOZES); break;
    }
    Serial.print(" | WiFi: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  }
}
