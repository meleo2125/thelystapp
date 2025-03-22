import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { generateOTP, sendOTPEmail } from "./emailService";

// OTP collection name in Firestore
const OTP_COLLECTION = "otps";

// OTP expiration time in milliseconds (10 minutes)
const OTP_EXPIRATION = 10 * 60 * 1000;

// Generate and store OTP for a user
export const createOTP = async (email: string): Promise<string> => {
  try {
    const otp = generateOTP();
    
    // Store OTP in Firestore with timestamp
    await setDoc(doc(db, OTP_COLLECTION, email), {
      otp,
      createdAt: serverTimestamp(),
      email
    });
    
    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      throw new Error("Failed to send OTP email");
    }
    
    return otp;
  } catch (error) {
    console.error("Error creating OTP:", error);
    throw error;
  }
};

// Verify OTP for a user
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  try {
    const otpRef = doc(db, OTP_COLLECTION, email);
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      return false;
    }
    
    const data = otpDoc.data();
    const createdAt = data.createdAt?.toDate() || new Date(0);
    const now = new Date();
    
    // Check if OTP has expired
    if (now.getTime() - createdAt.getTime() > OTP_EXPIRATION) {
      await deleteDoc(otpRef); // Delete expired OTP
      return false;
    }
    
    // Check if OTP matches
    if (data.otp !== otp) {
      return false;
    }
    
    // Delete OTP after successful verification
    await deleteDoc(otpRef);
    
    return true;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return false;
  }
}; 