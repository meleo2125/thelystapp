import nodemailer from 'nodemailer';
import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = async (email: string, otp: string, registrationId?: string): Promise<void> => {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
  
  await adminDb.collection('otps').doc(email).set({
    otp,
    email,
    expiresAt,
    createdAt: Timestamp.now(),
    registrationId: registrationId || null
  });
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your TheLyst App Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Thank you for registering with TheLyst App. Use the verification code below to complete your registration:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; margin: 0; letter-spacing: 5px; color: #4a5568;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email sending error:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve();
      }
    });
  });
};

export const sendResetEmail = async (email: string, resetLink: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your TheLyst password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>We received a request to reset the password for your TheLyst account. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #E8001C; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Reset email sending error:', error);
        reject(error);
      } else {
        console.log('Reset email sent:', info.response);
        resolve();
      }
    });
  });
};