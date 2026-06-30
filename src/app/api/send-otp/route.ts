import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, storeOTP, sendOTPEmail } from '@/backend/mailer';
import { z } from 'zod';

const postSchema = z.object({
  email: z.string().email('Invalid email address'),
  registrationId: z.string().min(1, 'Registration ID is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = postSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { email, registrationId } = result.data;
    
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