import Alarm from '../models/Alarm.js';
import Medicine from '../models/Medicine.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const getFirebaseConfig = () => {
  const url = process.env.FIREBASE_URL;
  const secret = process.env.FIREBASE_SECRET;
  const normalizedUrl = url && url.endsWith('/') ? url.slice(0, -1) : url;
  return { url: normalizedUrl, secret };
};

// Global in-memory cache of the latest device status
export let deviceStatusCache = {
  boxStatus: 'closed',
  alarmState: 'IDLE',
  buzzerStatus: false,
  missedDoseCount: 0,
  lastDoseTaken: 'No doses taken today',
};

// Polling state tracking variables
let lastDoseTakenRef = null;
let lastMissedDoseCountRef = 0;
let lastResetDay = new Date().getDate();
let isFirstPoll = true;

/**
 * Synchronize the user's top 3 enabled alarms to Firebase
 * @param {string} userId - MongoDB User ID
 */
export async function syncAlarmsToFirebase(userId) {
  const { url: normalizedUrl, secret: FIREBASE_SECRET } = getFirebaseConfig();
  if (!normalizedUrl || !FIREBASE_SECRET) {
    console.warn('[FirebaseSync] Firebase URL or Secret not set in environment.');
    return;
  }

  try {
    // Fetch all enabled alarms for this user, sorted by time ascending
    const alarms = await Alarm.find({ user: userId, enabled: true })
      .populate('medicine')
      .sort({ time: 1 });

    const payload = {};
    for (let i = 0; i < 3; i++) {
      const alarm = alarms[i];
      if (alarm) {
        const [hourStr, minStr] = alarm.time.split(':');
        payload[`slot${i}`] = {
          hour: parseInt(hourStr, 10),
          minute: parseInt(minStr, 10),
          alarmId: alarm._id.toString(),
          medicineName: alarm.medicine ? alarm.medicine.name : alarm.name,
          medicineCompartment: alarm.medicineCompartment || (alarm.medicine ? alarm.medicine.compartment : 1)
        };
      } else {
        // Disabled/unused slots are marked with -1
        payload[`slot${i}`] = {
          hour: -1,
          minute: -1,
          alarmId: '',
          medicineName: '',
          medicineCompartment: 1
        };
      }
    }

    const url = `${normalizedUrl}/medicineBox/alarms.json?auth=${FIREBASE_SECRET}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[FirebaseSync] Failed to sync schedules to Firebase: ${response.statusText} - ${errText}`);
    } else {
      console.log(`[FirebaseSync] Successfully synced schedule slots to Firebase.`);
    }
  } catch (error) {
    console.error(`[FirebaseSync] Error synchronizing schedules:`, error);
  }
}

/**
 * Triggers manual snooze command on Firebase
 */
export async function snoozeDeviceAlarm() {
  const { url: normalizedUrl, secret: FIREBASE_SECRET } = getFirebaseConfig();
  if (!normalizedUrl || !FIREBASE_SECRET) return false;

  try {
    const url = `${normalizedUrl}/medicineBox/manualSnooze.json?auth=${FIREBASE_SECRET}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'true',
    });
    return response.ok;
  } catch (error) {
    console.error('[FirebaseSync] Error triggering snooze:', error);
    return false;
  }
}

/**
 * Background polling loop function
 */
async function pollFirebase() {
  const { url: normalizedUrl, secret: FIREBASE_SECRET } = getFirebaseConfig();
  if (!normalizedUrl || !FIREBASE_SECRET) return;

  try {
    const url = `${normalizedUrl}/medicineBox.json?auth=${FIREBASE_SECRET}`;
    const response = await fetch(url);
    if (!response.ok) return;

    const data = await response.json();
    if (!data) return;

    // Update global status cache
    deviceStatusCache = {
      boxStatus: data.boxStatus || 'closed',
      alarmState: data.alarmState || 'IDLE',
      buzzerStatus: data.buzzerStatus || false,
      missedDoseCount: data.missedDoseCount || 0,
      lastDoseTaken: data.lastDoseTaken || 'No doses taken today',
    };

    // On startup, capture current Firebase values as reference
    if (isFirstPoll) {
      lastDoseTakenRef = data.lastDoseTaken;
      lastMissedDoseCountRef = data.missedDoseCount || 0;
      isFirstPoll = false;
      console.log('[FirebasePoll] Initialized listeners with reference status:', deviceStatusCache);
      return;
    }

    // 1. Process Physical Dose Acknowledged (Lid Open events during alarms)
    if (data.lastDoseTaken && data.lastDoseTaken !== lastDoseTakenRef) {
      console.log(`[FirebasePoll] New dose event detected: "${data.lastDoseTaken}"`);
      lastDoseTakenRef = data.lastDoseTaken;

      // Extract slot index (e.g. "(Slot 1)")
      const match = data.lastDoseTaken.match(/\(Slot (\d)\)/i);
      if (match) {
        const slotIdx = parseInt(match[1], 10) - 1;
        const slotKey = `slot${slotIdx}`;
        
        if (data.alarms && data.alarms[slotKey]) {
          const { alarmId, medicineCompartment, medicineName } = data.alarms[slotKey];
          if (alarmId) {
            const alarm = await Alarm.findById(alarmId);
            if (alarm && alarm.status !== 'completed') {
              // Update Alarm status in MongoDB
              alarm.status = 'completed';
              await alarm.save();
              console.log(`[FirebasePoll] Marked Alarm ${alarmId} as completed in MongoDB`);

              // Decrement Medicine Pill Count
              if (alarm.medicine) {
                const medicine = await Medicine.findById(alarm.medicine);
                if (medicine) {
                  medicine.remainingPillCount = Math.max(0, medicine.remainingPillCount - 1);
                  await medicine.save();
                  console.log(`[FirebasePoll] Decremented stock for ${medicine.name} to ${medicine.remainingPillCount}`);

                  // Raise alert if stock is low
                  if (medicine.remainingPillCount <= medicine.lowStockThreshold) {
                    await Notification.create({
                      user: alarm.user,
                      type: 'low_stock',
                      title: 'Low Pill Stock Alert',
                      message: `Medicine "${medicine.name}" is running low (${medicine.remainingPillCount} pills left).`
                    });
                  }
                }
              }

              // Create Notification for Taken Dose
              await Notification.create({
                user: alarm.user,
                type: 'dose_taken',
                title: 'Dose Taken',
                message: `Dose for "${alarm.name}" (Compartment ${medicineCompartment}) was physically taken.`,
                metadata: {
                  alarmId: alarm._id,
                  alarmName: alarm.name,
                  medicineId: alarm.medicine || null,
                  medicineName: medicineName || alarm.name,
                  compartment: medicineCompartment,
                  status: 'taken'
                }
              });
            }
          }
        }
      }
    }

    // 2. Process Missed Dose Counters
    const missedDoseCount = data.missedDoseCount || 0;
    if (missedDoseCount > lastMissedDoseCountRef) {
      console.log(`[FirebasePoll] Missed dose count incremented: ${lastMissedDoseCountRef} -> ${missedDoseCount}`);
      lastMissedDoseCountRef = missedDoseCount;

      // Extract user ID from one of the active slots in Firebase to assign the notification
      let targetUserId = null;
      if (data.alarms) {
        for (let i = 0; i < 3; i++) {
          if (data.alarms[`slot${i}`]?.alarmId) {
            const alarm = await Alarm.findById(data.alarms[`slot${i}`].alarmId);
            if (alarm) {
              targetUserId = alarm.user;
              break;
            }
          }
        }
      }

      // If no active alarms mapped, fall back to the first patient user in database
      if (!targetUserId) {
        const patient = await User.findOne({ role: 'patient' });
        if (patient) targetUserId = patient._id;
      }

      if (targetUserId) {
        await Notification.create({
          user: targetUserId,
          type: 'dose_missed',
          title: 'Dose Missed Alert',
          message: `A scheduled medicine dose was missed today. Total missed today: ${missedDoseCount}.`,
          metadata: {
            missedDoseCount,
            status: 'missed'
          }
        });
        console.log(`[FirebasePoll] Created missed dose notification for user ${targetUserId}`);
      }
    }

    // 3. Handle Midnight Reset (Day Switch)
    const today = new Date().getDate();
    if (today !== lastResetDay) {
      console.log('[FirebasePoll] Midnight date change detected. Resetting alarm schedules...');
      lastResetDay = today;

      // Reset MongoDB alarm states
      await Alarm.updateMany({ status: 'completed' }, { status: 'active' });
      console.log('[FirebasePoll] Reset all MongoDB completed alarms to active.');

      // Reset Missed Dose count on Firebase Realtime DB
      const resetUrl = `${normalizedUrl}/medicineBox.json?auth=${FIREBASE_SECRET}`;
      await fetch(resetUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missedDoseCount: 0 })
      });
      lastMissedDoseCountRef = 0;
      console.log('[FirebasePoll] Reset missedDoseCount on Firebase to 0.');
    }

  } catch (error) {
    console.error('[FirebasePoll] Error during Firebase poll cycle:', error);
  }
}

/**
 * Initializes background polling of the Firebase Realtime Database
 */
export function startFirebasePolling() {
  const { url: normalizedUrl, secret: FIREBASE_SECRET } = getFirebaseConfig();
  if (!normalizedUrl || !FIREBASE_SECRET) {
    console.warn('[FirebasePoll] Firebase credentials not configured. Skipping background poller.');
    return;
  }

  console.log('[FirebasePoll] Starting background Firebase polling (every 5s)...');
  setInterval(pollFirebase, 5000);
}
