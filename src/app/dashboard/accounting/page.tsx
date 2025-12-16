
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Banknote } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  runTransaction,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Account, Transaction } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth';


function NewTransactionDialog({ accountId, onTransactionAdded }: { accountId: string; onTransactionAdded: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!accountId || isNaN(parsedAmount) || parsedAmount <= 0 || !note.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please fill out all fields correctly.',
      });
      return;
    }
    if (!firebaseUser) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    setLoading(true);
    try {
        const appUser = await getCurrentUser(firebaseUser);
        const accountRef = doc(firestore, 'accounts', accountId);
        const transactionsRef = collection(firestore, `accounts/${accountId}/transactions`);
        
        await runTransaction(firestore, async (transaction) => {
            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) {
                throw new Error("Account does not exist.");
            }

            const currentBalance = accountDoc.data().balance;
            const newBalance = type === 'income' ? currentBalance + parsedAmount : currentBalance - parsedAmount;
            
            // 1. Add new transaction document
            const newTransactionRef = doc(transactionsRef);
            transaction.set(newTransactionRef, {
                accountId: accountId,
                type: type,
                amount: parsedAmount,
                note: note,
                runningBalance: newBalance,
                createdAt: serverTimestamp(),
                createdBy: appUser.id,
                createdByName: appUser.name || 'N/A',
            });

            // 2. Update account balance
            transaction.update(accountRef, { balance: newBalance });
        });

      toast({
        title: 'Transaction Recorded',
        description: 'The transaction has been successfully saved.',
      });
      onTransactionAdded();
      setOpen(false);
      setAmount('');
      setNote('');
    } catch (error: any) {
      console.error('Failed to record transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!accountId}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense for the selected account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Tabs value={type} onValueChange={setType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Income (Credit)</TabsTrigger>
                <TabsTrigger value="expense">Expense (Debit)</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="e.g., Office supplies, Client payment"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Recording...' : 'Record Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewAccountDialog({ onAccountAdded }: { onAccountAdded: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedBalance = parseFloat(initialBalance);
    if (!accountName.trim() || isNaN(parsedBalance)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please provide a valid account name and initial balance.',
      });
      return;
    }
     if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    setLoading(true);
    try {
      await addDoc(collection(firestore, 'accounts'), {
        name: accountName,
        balance: parsedBalance,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      toast({
        title: 'Account Created',
        description: `Account "${accountName}" has been created.`,
      });
      onAccountAdded();
      setOpen(false);
      setAccountName('');
      setInitialBalance('0');
    } catch (error: any) {
      console.error('Failed to create account:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Set up a new financial account to track.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., Petty Cash, Main Bank Account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-balance">Initial Balance</Label>
              <Input
                id="initial-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountingPage() {
  const firestore = useFirestore();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const accountsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'accounts'), orderBy('name', 'asc')) : null),
    [firestore, refreshKey]
  );
  const { data: accounts, isLoading: areAccountsLoading } = useCollection<Account>(accountsQuery);

  const transactionsQuery = useMemoFirebase(
    () => (firestore && selectedAccountId ? query(collection(firestore, `accounts/${selectedAccountId}/transactions`), orderBy('createdAt', 'desc')) : null),
    [firestore, selectedAccountId, refreshKey]
  );
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);
  
  const selectedAccount = useMemo(() => accounts?.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const forceRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            Accounting
        </h1>
        <div className="flex gap-2">
            <NewAccountDialog onAccountAdded={forceRefresh} />
            <NewTransactionDialog accountId={selectedAccountId!} onTransactionAdded={forceRefresh} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>Select an account to view its balance and transaction history.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/3">
            <Label htmlFor="account-select">Select Account</Label>
            {areAccountsLoading ? (
                <Loader2 className="mt-2 h-5 w-5 animate-spin" />
            ) : (
                <Select onValueChange={handleAccountChange} value={selectedAccountId}>
                    <SelectTrigger id="account-select">
                        <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
          </div>
          {selectedAccount && (
            <div className="flex-1 text-center md:text-right">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-4xl font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(selectedAccount.balance)}
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {selectedAccount ? `Showing transactions for ${selectedAccount.name}` : 'Select an account to see its history.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areTransactionsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleString() : '...'}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{tx.note}</TableCell>
                    <TableCell>{tx.createdByName}</TableCell>
                    <TableCell className="text-right font-mono">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(tx.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    {selectedAccountId ? 'No transactions for this account yet.' : 'Please select an account.'}
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
