import dotenv from 'dotenv';
dotenv.config();

import { sendMissedDoseEmail } from './src/services/emailService.js';

async function testEmail() {
  console.log('Sending test email to ranusharithushan@gmail.com...');
  try {
    await sendMissedDoseEmail('ranusharithushan@gmail.com', 'Test Patient', 1);
    console.log('If your credentials are correct, you should receive an email shortly.');
    console.log('If it failed, you likely need a Google App Password instead of your normal password!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmail();
