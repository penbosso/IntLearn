'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Flame, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { getCurrentUser, type User } from '@/lib/auth';
import { EarnedBadges } from '@/components/earned-badges';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isUserLoading && firebaseUser) {
      getCurrentUser(firebaseUser).then(user => {
        setUser(user);
        setDisplayName(user.name);
      });
    }
  }, [firebaseUser, isUserLoading]);

  const handleSaveChanges = async () => {
    if (!firebaseUser || !displayName.trim()) {
        toast({
            variant: 'destructive',
            title: 'Invalid Name',
            description: 'Name cannot be empty.',
        });
        return;
    }

    setIsSaving(true);
    try {
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
            displayName: displayName.trim(),
        });
        toast({
            title: 'Profile Updated',
            description: 'Your changes have been saved successfully.',
        });
        // Optionally, refetch user to update state if needed, though Firestore listener should do it
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Saving',
            description: error.message || 'Could not save your changes.',
        });
    } finally {
        setIsSaving(false);
    }
  };


  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Profile & Settings</h1>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user.email} disabled />
              </div>
              <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
           <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.xp.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Keep up the great work!</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
                        <Flame className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.streak} Days</div>
                        <p className="text-xs text-muted-foreground">Consistency is key.</p>
                    </CardContent>
                </Card>
           </div>

          <EarnedBadges userId={user.id} />
        </div>
      </div>
    </div>
  );
}
