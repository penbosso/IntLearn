
// In a real app, you would have a robust authentication system.
// For this prototype, we'll use a mock user object.
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase'; 

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  avatarUrl: string;
  xp: number;
  streak: number;
  lastActivityDate?: any; // Can be a Firestore Timestamp
};

// To test different roles, change the 'role' property here.
// role: 'student' or role: 'admin'
const mockUser: User = {
  id: '1',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  role: 'student',
  avatarUrl: 'https://i.pravatar.cc/150?u=alexdoe',
  xp: 1250,
  streak: 5,
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
        name: userData.displayName || firebaseUser.displayName || 'Anonymous',
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
        name: firebaseUser.displayName || 'Anonymous',
        email: firebaseUser.email || '',
        avatarUrl: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        role: 'student',
        xp: 0,
        streak: 0,
      };
    }
  }

  // Simulate an API call for logged-out user or for testing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockUser);
    }, 100);
  });
}

// You can add more mock users for features like leaderboards
export const mockUsers: User[] = [
  mockUser,
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'student',
    avatarUrl: 'https://i.pravatar.cc/150?u=janesmith',
    xp: 2300,
    streak: 12,
  },
  {
    id: '3',
    name: 'Sam Wilson',
    email: 'sam.wilson@example.com',
    role: 'student',
    avatarUrl: 'https://i.pravatar.cc/150?u=samwilson',
    xp: 850,
    streak: 2,
  },
  {
    id: '99',
    name: 'Dr. Evelyn Reed',
    email: 'e.reed@example.com',
    role: 'admin',
    avatarUrl: 'https://i.pravatar.cc/150?u=dreed',
    xp: 0,
    streak: 0,
  },
];

    