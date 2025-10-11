// In a real app, you would have a robust authentication system.
// For this prototype, we'll use a mock user object.

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  avatarUrl: string;
  xp: number;
  streak: number;
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

export async function getCurrentUser(): Promise<User> {
  // Simulate an API call
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
