import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendMissedDoseEmail = async (caregiverEmail, patientName, missedCount) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EmailService] SMTP credentials missing, skipping missed dose email to:', caregiverEmail);
    return;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: caregiverEmail,
    subject: 'MedAlert: Missed Dose Alert',
    html: `
      <h2>MedAlert Notification</h2>
      <p>Hello,</p>
      <p>This is an automated alert to notify you that <strong>${patientName || 'the patient'}</strong> has missed a scheduled medication dose.</p>
      <p>Total doses missed today: <strong>${missedCount}</strong></p>
      <p>Please check in with them to ensure their care plan remains on track.</p>
      <br />
      <p>Stay healthy,<br/>The MedAlert Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Missed dose alert sent to caregiver at ${caregiverEmail}`);
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
  }
};
