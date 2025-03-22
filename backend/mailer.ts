import nodemailer from 'nodemailer';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

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
  // Store OTP with 5-minute expiration
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
  
  await setDoc(doc(db, 'otps', email), {
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

export const verifyOTP = async (email: string, inputOTP: string): Promise<boolean> => {
  try {
    // Get OTP document from Firestore directly
    const otpDocRef = doc(db, 'otps', email);
    const otpDoc = await getDoc(otpDocRef);
    
    if (!otpDoc.exists()) {
      return false;
    }
    
    const otpData = otpDoc.data();
    const now = Timestamp.now();
    
    // Check if OTP is expired
    if (otpData.expiresAt.seconds < now.seconds) {
      return false;
    }
    
    // Verify OTP
    return otpData.otp === inputOTP;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}; 