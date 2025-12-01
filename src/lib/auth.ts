// In a real app, you would have a robust authentication system.
// For this prototype, we'll use a mock user object.
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase'; 

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'creator' | 'accountant';
  avatarUrl: string;
  xp: number;
  streak: number;
  lastActivityDate?: any; // Can be a Firestore Timestamp
};

export async function getCurrentUser(firebaseUser?: FirebaseUser | null): Promise<User> {
  if (firebaseUser) {
    const { firestore } = initializeFirebase();
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        name: userData.displayName || firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        role: userData.role || 'student',
        xp: userData.xp || 0,
        streak: userData.streak || 0,
        lastActivityDate: userData.lastActivityDate,
      };
    } else {
      // Default user profile if not in DB
       return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        avatarUrl: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        role: 'student',
        xp: 0,
        streak: 0,
      };
    }
  }
  
  // This should not be hit in a real scenario with auth guards
  return {
    id: 'mock-user',
    name: 'User',
    email: 'user@example.com',
    role: 'student',
    avatarUrl: '',
    xp: 0,
    streak: 0,
  };
}

    