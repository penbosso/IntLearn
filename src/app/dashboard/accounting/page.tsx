
'use client';

import { useState, useMemo, Fragment } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Banknote, Trash2, FilePlus2, HandCoins, ArrowRightLeft } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  runTransaction,
  doc,
  serverTimestamp,
  getDocs,
  writeBatch,
  updateDoc
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

function NewAccountDialog({ onAccountAdded, parentId = null }: { onAccountAdded: () => void, parentId?: string | null }) {
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
      const appUser = await getCurrentUser(user);
      const newAccountRef = doc(collection(firestore, 'accounts'));

      await runTransaction(firestore, async (transaction) => {
        // 1. Create the account
        transaction.set(newAccountRef, {
            name: accountName,
            balance: parsedBalance,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            parentId: parentId,
            type: 'standard',
            status: 'open',
        });

        // 2. Create the initial transaction if balance is not 0
        if (parsedBalance !== 0) {
            const newTransactionRef = doc(collection(newAccountRef, 'transactions'));
            transaction.set(newTransactionRef, {
                accountId: newAccountRef.id,
                type: 'income',
                amount: parsedBalance,
                note: 'Initial Balance',
                runningBalance: parsedBalance, // The first transaction's running balance is the balance itself
                createdAt: serverTimestamp(),
                createdBy: appUser.id,
                createdByName: appUser.name || 'N/A',
            });
        }
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
            <DialogTitle>Create New Standard Account</DialogTitle>
            <DialogDescription>
              Set up a new ledger account. This can be a parent account (e.g., "Assets") or a sub-account.
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

function NewReceivableDialog({ onAccountAdded, accounts }: { onAccountAdded: () => void, accounts: Account[] }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsedAmount = parseFloat(invoiceAmount);
        if (!customerName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input' });
            return;
        }
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        if (!parentId) {
            toast({ variant: 'destructive', title: 'Parent Account Required', description: 'Please select a parent account to record the receivable under.' });
            return;
        }

        setLoading(true);
        try {
            const appUser = await getCurrentUser(user);
            const newAccountRef = doc(collection(firestore, 'accounts'));

            await runTransaction(firestore, async (transaction) => {
                const parentAccountRef = doc(firestore, 'accounts', parentId);
                const parentAccountDoc = await transaction.get(parentAccountRef);
                if (!parentAccountDoc.exists()) {
                    throw new Error("Parent account not found.");
                }
                
                // 1. Create the receivable account
                transaction.set(newAccountRef, {
                    name: customerName,
                    balance: parsedAmount,
                    initialAmount: parsedAmount,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    parentId: parentId,
                    type: 'receivable',
                    status: 'open',
                });

                // 2. Create the initial transaction for the receivable account
                const newReceivableTransactionRef = doc(collection(newAccountRef, 'transactions'));
                 transaction.set(newReceivableTransactionRef, {
                    accountId: newAccountRef.id,
                    type: 'income', // Represents the credit extended
                    amount: parsedAmount,
                    note: 'Initial receivable amount',
                    runningBalance: parsedAmount,
                    createdAt: serverTimestamp(),
                    createdBy: appUser.id,
                    createdByName: appUser.name || 'N/A',
                });

                // 3. Update parent account balance and add transaction
                const currentParentBalance = parentAccountDoc.data()!.balance;
                const newParentBalance = currentParentBalance + parsedAmount;
                
                transaction.update(parentAccountRef, { balance: newParentBalance });

                const parentTransactionRef = doc(collection(parentAccountRef, 'transactions'));
                transaction.set(parentTransactionRef, {
                    accountId: parentId,
                    type: 'income',
                    amount: parsedAmount,
                    note: `New receivable created: ${customerName}`,
                    runningBalance: newParentBalance,
                    createdAt: serverTimestamp(),
                    createdBy: appUser.id,
                    createdByName: appUser.name || 'N/A',
                });
            });


            toast({ title: 'Receivable Created', description: `A new receivable for ${customerName} has been recorded.` });
            onAccountAdded();
            setOpen(false);
            setCustomerName('');
            setInvoiceAmount('');
            setParentId(null);
        } catch (error: any) {
            console.error('Failed to create receivable:', error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New Receivable
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Receivable</DialogTitle>
                        <DialogDescription>
                            Record a new credit sale or invoice for a customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="space-y-2">
                            <Label htmlFor="parent-account">Parent Account</Label>
                             <Select onValueChange={(value) => setParentId(value)} value={parentId || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Group under..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.filter(a => a.type === 'standard' && !a.parentId).map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-name">Customer / Invoice Name</Label>
                            <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invoice-amount">Amount</Label>
                            <Input id="invoice-amount" type="number" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Receivable'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SettleReceivableDialog({ receivable, onSettled }: { receivable: Account, onSettled: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: firebaseUser } = useUser();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [note, setNote] = useState(`Payment for ${receivable.name}`);

    const handleSettle = async () => {
        const parsedAmount = parseFloat(paymentAmount);
        if (!receivable.parentId || isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'A valid amount is required and the receivable must have a parent account.' });
            return;
        }
        if (!firebaseUser) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        if (parsedAmount > receivable.balance) {
             toast({ variant: 'destructive', title: 'Overpayment', description: 'Payment cannot be greater than the remaining balance.' });
            return;
        }

        setLoading(true);
        try {
            const appUser = await getCurrentUser(firebaseUser);
            const receivableRef = doc(firestore, 'accounts', receivable.id);
            const parentRef = doc(firestore, 'accounts', receivable.parentId);

            await runTransaction(firestore, async (transaction) => {
                const receivableDoc = await transaction.get(receivableRef);
                const parentDoc = await transaction.get(parentRef);
                
                if (!receivableDoc.exists() || !parentDoc.exists()) {
                    throw new Error("Receivable or its parent account does not exist.");
                }

                // 1. Update receivable account balance (decrease)
                const newReceivableBalance = receivableDoc.data().balance - parsedAmount;
                transaction.update(receivableRef, { balance: newReceivableBalance });

                // 2. Add 'payment' transaction to receivable account
                const receivableTransactionRef = doc(collection(firestore, `accounts/${receivable.id}/transactions`));
                transaction.set(receivableTransactionRef, {
                    type: 'payment', 
                    amount: parsedAmount, 
                    note, 
                    runningBalance: newReceivableBalance,
                    createdAt: serverTimestamp(), createdBy: appUser.id, createdByName: appUser.name
                });
            });

            if (receivable.balance - parsedAmount === 0) {
                 await updateDoc(receivableRef, { status: 'closed' });
                 toast({ title: 'Receivable Closed!', description: `${receivable.name} has been fully paid and closed.` });
            } else {
                 toast({ title: 'Payment Recorded', description: 'The payment has been successfully recorded.' });
            }
            
            onSettled();
            setOpen(false);
            setPaymentAmount('');

        } catch (error: any) {
             console.error("Failed to settle receivable:", error);
            toast({ variant: 'destructive', title: 'Settlement Failed', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <HandCoins className="mr-2 h-4 w-4" />
                    Settle Receivable
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settle Receivable for {receivable.name}</DialogTitle>
                    <DialogDescription>
                       Remaining Balance: <span className="font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(receivable.balance)}</span>
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Payment Amount</Label>
                        <div className="flex gap-2">
                            <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                             <Button variant="outline" onClick={() => setPaymentAmount(String(receivable.balance))}>Full</Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                 </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSettle} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Record Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NewTransferDialog({ onTransferAdded, accounts }: { onTransferAdded: () => void, accounts: Account[] }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: firebaseUser } = useUser();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [fromAccountId, setFromAccountId] = useState<string | null>(null);
    const [toAccountId, setToAccountId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const standardAccounts = useMemo(() => accounts.filter(a => a.type === 'standard'), [accounts]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsedAmount = parseFloat(amount);

        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please select two different accounts and a valid amount.' });
            return;
        }
        if (!firebaseUser) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }

        setLoading(true);
        try {
            const appUser = await getCurrentUser(firebaseUser);
            const fromAccountRef = doc(firestore, 'accounts', fromAccountId);
            const toAccountRef = doc(firestore, 'accounts', toAccountId);
            const transferId = doc(collection(firestore, 'accounts')).id; // Just for a unique ID

            await runTransaction(firestore, async (transaction) => {
                const fromDoc = await transaction.get(fromAccountRef);
                const toDoc = await transaction.get(toAccountRef);

                if (!fromDoc.exists() || !toDoc.exists()) {
                    throw new Error("One or both accounts not found.");
                }

                const fromData = fromDoc.data();
                const toData = toDoc.data();

                // Update balances
                const newFromBalance = fromData.balance - parsedAmount;
                const newToBalance = toData.balance + parsedAmount;
                transaction.update(fromAccountRef, { balance: newFromBalance });
                transaction.update(toAccountRef, { balance: newToBalance });

                // Create debit transaction
                const debitTxRef = doc(collection(fromAccountRef, 'transactions'));
                transaction.set(debitTxRef, {
                    type: 'transfer', amount: parsedAmount, note: `Transfer to ${toData.name}. ${note}`,
                    runningBalance: newFromBalance, transferId: transferId,
                    createdAt: serverTimestamp(), createdBy: appUser.id, createdByName: appUser.name
                });

                // Create credit transaction
                const creditTxRef = doc(collection(toAccountRef, 'transactions'));
                transaction.set(creditTxRef, {
                    type: 'transfer', amount: parsedAmount, note: `Transfer from ${fromData.name}. ${note}`,
                    runningBalance: newToBalance, transferId: transferId,
                    createdAt: serverTimestamp(), createdBy: appUser.id, createdByName: appUser.name
                });
            });

            toast({ title: 'Transfer Successful', description: 'The transfer has been recorded.' });
            onTransferAdded();
            setOpen(false);
            setFromAccountId(null);
            setToAccountId(null);
            setAmount('');
            setNote('');
        } catch (error: any) {
            console.error("Transfer failed:", error);
            toast({ variant: 'destructive', title: 'Transfer Failed', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    New Transfer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Transfer Between Accounts</DialogTitle>
                        <DialogDescription>Move funds from one standard account to another.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From (Debit)</Label>
                                <Select onValueChange={setFromAccountId} value={fromAccountId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                                    <SelectContent>
                                        {standardAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>To (Credit)</Label>
                                <Select onValueChange={setToAccountId} value={toAccountId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                                    <SelectContent>
                                        {standardAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Note (Optional)</Label>
                            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Transferring...' : 'Record Transfer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteAccountButton({ account, onAccountDeleted }: { account: Account, onAccountDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const transactionsRef = collection(firestore, `accounts/${account.id}/transactions`);
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      const batch = writeBatch(firestore);
      
      transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const accountRef = doc(firestore, 'accounts', account.id);
      batch.delete(accountRef);
      
      await batch.commit();

      toast({
        title: 'Account Deleted',
        description: `Account "${account.name}" and all its transactions have been deleted.`,
      });
      onAccountDeleted();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Could not delete the account.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
     <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={loading}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the account 
            <span className="font-semibold"> "{account.name}"</span> and all of its associated transactions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  
  const { hierarchicalAccounts, totalBalance } = useMemo(() => {
    if (!accounts) return { hierarchicalAccounts: [], totalBalance: 0 };

    const accountsById = new Map(accounts.map(acc => [acc.id, { ...acc, children: [] as Account[] }]));
    const rootAccounts: Account[] = [];
    let total = 0;

    accounts.forEach(acc => {
      // Only include standard, non-nested accounts in the total company liquidity
      if (acc.type === 'standard' && !acc.parentId) {
        total += acc.balance;
      }
      const accountWithChildren = accountsById.get(acc.id)!;
      if (acc.parentId && accountsById.has(acc.parentId)) {
        accountsById.get(acc.parentId)!.children.push(accountWithChildren);
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });
     // Sort children alphabetically
    accountsById.forEach(acc => {
        acc.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { hierarchicalAccounts: rootAccounts, totalBalance: total };
  }, [accounts]);
  
  const selectedAccount = useMemo(() => accounts?.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
  };
  
  const handleAccountDeleted = () => {
    setSelectedAccountId(undefined);
    forceRefresh();
  };

  const forceRefresh = () => setRefreshKey(prev => prev + 1);
  
  const renderAccountOptions = (accounts: Account[], level = 0) => {
    return accounts.map(acc => (
      <Fragment key={acc.id}>
        <SelectItem value={acc.id} style={{ paddingLeft: `${level * 1.5}rem` }}>
           {acc.type === 'receivable' && '↳'} {acc.name} {acc.type === 'receivable' ? `(Owed: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(acc.balance)})` : ''}
        </SelectItem>
        {acc.children && acc.children.length > 0 && renderAccountOptions(acc.children, level + 1)}
      </Fragment>
    ));
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            Accounting
        </h1>
        <div className="flex gap-2">
            <NewAccountDialog onAccountAdded={forceRefresh} />
            <NewReceivableDialog onAccountAdded={forceRefresh} accounts={accounts || []} />
            <NewTransferDialog onTransferAdded={forceRefresh} accounts={accounts || []} />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
            <CardHeader>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>Select an account to view its balance and transaction history.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2">
                <Label htmlFor="account-select">Select Account</Label>
                {areAccountsLoading ? (
                    <Loader2 className="mt-2 h-5 w-5 animate-spin" />
                ) : (
                    <Select onValueChange={handleAccountChange} value={selectedAccountId}>
                        <SelectTrigger id="account-select">
                            <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                            {renderAccountOptions(hierarchicalAccounts)}
                        </SelectContent>
                    </Select>
                )}
            </div>
            {selectedAccount && (
                <div className="flex-1 text-center md:text-right">
                    <p className="text-sm text-muted-foreground">
                        {selectedAccount.type === 'receivable' ? 'Remaining Balance' : 'Current Balance'}
                    </p>
                    <p className="text-4xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(selectedAccount.balance)}
                    </p>
                </div>
            )}
            </CardContent>
            {selectedAccount && (
                <CardFooter className="justify-end border-t pt-4 gap-2">
                    {selectedAccount.type === 'receivable' && selectedAccount.status === 'open' && (
                        <SettleReceivableDialog receivable={selectedAccount} onSettled={forceRefresh} />
                    )}
                    {selectedAccount.type === 'standard' && (
                        <NewTransactionDialog accountId={selectedAccountId!} onTransactionAdded={forceRefresh} />
                    )}
                    <DeleteAccountButton account={selectedAccount} onAccountDeleted={handleAccountDeleted} />
                </CardFooter>
            )}
        </Card>
        <Card>
             <CardHeader>
                <CardTitle>Company Liquidity</CardTitle>
                <CardDescription>Total balance across all root-level standard accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS' }).format(totalBalance)}
                </p>
            </CardContent>
        </Card>
      </div>

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
                      <span className={`font-semibold capitalize ${
                            tx.type === 'income' ? 'text-green-500' :
                            tx.type === 'expense' ? 'text-red-500' :
                            tx.type === 'payment' ? 'text-blue-500' :
                            'text-purple-500' // For transfers
                        }`}>
                        {tx.type}
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
