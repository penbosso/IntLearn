
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Query } from 'firebase/firestore';
import type { User, UserRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function AdminUsersPage() {
  const firestore = useFirestore();
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');

  // Fetch all users and filter on the client to handle both `role` and `roles` fields
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery as Query<User> | null);

  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];
    
    const filtered = users.filter(user => {
        if (filterRole === 'all') return true;
        // Handle both `roles` (array) and `role` (string) for backward compatibility
        const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
        return userRoles.includes(filterRole);
    });

    return [...filtered].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [users, filterRole]);
  
  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-200 border-red-500/30';
      case 'creator':
        return 'bg-purple-500/20 text-purple-200 border-purple-500/30';
      case 'accountant':
        return 'bg-green-500/20 text-green-200 border-green-500/30';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users on the platform, ranked by XP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filterRole} onValueChange={(value) => setFilterRole(value as UserRole | 'all')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="student">Students</TabsTrigger>
              <TabsTrigger value="creator">Creators</TabsTrigger>
              <TabsTrigger value="admin">Admins</TabsTrigger>
              <TabsTrigger value="accountant">Accountants</TabsTrigger>
            </TabsList>
          </Tabs>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Total XP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAndSortedUsers.map((user) => {
                const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                          {userRoles.map(role => (
                              <span key={role} className={`px-2 py-1 text-xs font-semibold rounded-full capitalize border ${getRoleBadgeStyle(role)}`}>
                                  {role}
                              </span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {user.xp?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/users/${user.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!isLoading && filteredAndSortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No users found for the selected filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
