import nodemailer from 'nodemailer';

// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate a random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP verification email
export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification - TheLyst App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p style="color: #666; line-height: 1.5;">Thank you for registering with TheLyst. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4a90e2; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666; line-height: 1.5;">This OTP is valid for 10 minutes. If you did not request this verification, please ignore this email.</p>
          <p style="color: #666; line-height: 1.5;">Best regards,<br>The TheLyst Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}; 