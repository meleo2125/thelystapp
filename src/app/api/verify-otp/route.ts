import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../backend/firebase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');
  const otp = searchParams.get('otp');
  const registrationId = searchParams.get('registrationId');
  
  if (!email || !otp) {
    return NextResponse.json(
      { error: 'Email and OTP are required', valid: false },
      { status: 400 }
    );
  }
  
  try {
    // Get OTP document from Firestore
    const otpDocRef = doc(db, 'otps', email);
    const otpDoc = await getDoc(otpDocRef);
    
    if (!otpDoc.exists()) {
      return NextResponse.json(
        { error: 'OTP not found', valid: false },
        { status: 404 }
      );
    }
    
    const otpData = otpDoc.data();
    const now = Timestamp.now();
    
    // Check if OTP is expired
    if (otpData.expiresAt.seconds < now.seconds) {
      return NextResponse.json(
        { error: 'OTP has expired', valid: false },
        { status: 400 }
      );
    }
    
    // Verify OTP
    if (otpData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP', valid: false },
        { status: 400 }
      );
    }
    
    // If registrationId is provided, verify it matches
    if (registrationId && otpData.registrationId && otpData.registrationId !== registrationId) {
      return NextResponse.json(
        { error: 'Invalid verification session', valid: false },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'OTP verified successfully', valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', valid: false },
      { status: 500 }
    );
  }
} 