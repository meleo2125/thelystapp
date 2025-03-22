import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, storeOTP, sendOTPEmail } from '../../../../backend/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, registrationId } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in Firestore with registration ID
    await storeOTP(email, otp, registrationId);
    
    // Send OTP via email
    await sendOTPEmail(email, otp);
    
    return NextResponse.json(
      { success: true, message: 'OTP sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 