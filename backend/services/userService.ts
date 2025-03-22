import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// User collection name in Firestore
const USER_COLLECTION = "users";

// User interface
export interface User {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  photoURL?: string;
}

// Create a new user in Firestore
export const createUser = async (userData: User) => {
  try {
    await setDoc(doc(db, USER_COLLECTION, userData.uid), {
      ...userData,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error creating user:", error);
    return false;
  }
};

// Get user data from Firestore
export const getUser = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, USER_COLLECTION, uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Update user data in Firestore
export const updateUser = async (uid: string, data: Partial<User>) => {
  try {
    await updateDoc(doc(db, USER_COLLECTION, uid), {
      ...data,
      lastLoginAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

// Update user email verification status
export const updateEmailVerification = async (uid: string, isVerified: boolean) => {
  try {
    await updateDoc(doc(db, USER_COLLECTION, uid), {
      emailVerified: isVerified
    });
    return true;
  } catch (error) {
    console.error("Error updating email verification:", error);
    return false;
  }
}; 