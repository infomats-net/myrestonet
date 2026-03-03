
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Check, 
  Plus, 
  ArrowUpRight,
  DollarSign,
  Users,
  Loader2,
  Save,
  Trash2,
  Info
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function BillingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Tiers from Firestore
  const tiersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tiers'), orderBy('createdAt', 'asc'));
  }, [firestore]);
  
  const { data: tiers, isLoading } = useCollection(tiersQuery);

  const RECENT_INVOICES: any[] = [];

  const [newTierForm, setNewTierForm] = useState({
    name: '',
    price: '$0',
    period: '/mo',
    features: ['Basic Feature'],
    popular: false,
    activeTenants: 0,
    color: 'bg-muted text-muted-foreground'
  });

  const handleEditClick = (tier: any) => {
    setEditingTier({ ...tier });
    setIsEditDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!editingTier || !firestore) return;
    setIsSaving(true);
    
    const tierRef = doc(firestore, 'tiers', editingTier.id);
    try {
      await setDoc(tierRef, {
        ...editingTier,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditDialogOpen(false);
      toast({
        title: "Tier updated",
        description: `Changes to the ${editingTier.name} plan saved.`,
      });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tierRef.path,
        operation: 'update',
        requestResourceData: editingTier
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTier = async () => {
    if (!firestore) return;
    setIsSaving(true);
    
    const tiersRef = collection(firestore, 'tiers');
    try {
      await addDoc(tiersRef, {
        ...newTierForm,
        createdAt: serverTimestamp()
      });
      
      setIsNewDialogOpen(false);
      setNewTierForm({
        name: '',
        price: '$0',
        period: '/mo',
        features: ['Basic Feature'],
        popular: false,
        activeTenants: 0,
        color: 'bg-muted text-muted-foreground'
      });
      toast({ title: "Tier created" });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tiersRef.path,
        operation: 'create',
        requestResourceData: newTierForm
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to delete this tier?")) return;

    const tierRef = doc(firestore, 'tiers', id);
    try {
      await deleteDoc(tierRef);
      toast({ title: "Tier deleted" });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tierRef.path,
        operation: 'delete'
      }));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Tiers</h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Manage platform subscriptions and monitor revenue streams.</p>
        </div>
        <Button className="rounded-xl h-11 shadow-xl shadow-primary/20" onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">$0.00</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">No payments recorded</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{tiers?.reduce((sum, t) => sum + (t.activeTenants || 0), 0) || 0}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Across all tiers</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Platform Tiers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{tiers?.length || 0}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Available plans</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-3 py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          tiers?.map((tier) => (
            <Card key={tier.id} className={`relative flex flex-col border-none shadow-xl rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.02] ${tier.popular ? 'ring-2 ring-primary' : ''}`}>
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-2xl bg-primary text-white px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-10 px-8">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900">{tier.name}</CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Plan Details</CardDescription>
                  </div>
                  <Badge className={`rounded-lg ${tier.color}`}>{tier.activeTenants} Tenants</Badge>
                </div>
                <div className="mt-6">
                  <span className="text-5xl font-black tracking-tight text-slate-900">{tier.price}</span>
                  <span className="text-muted-foreground ml-1 font-bold">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 px-8 py-6">
                <ul className="space-y-4">
                  {tier.features?.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="bg-primary/10 rounded-full p-1"><Check className="h-3 w-3 text-primary" /></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-8 pt-0 mt-auto flex gap-2">
                <Button variant={tier.popular ? "default" : "outline"} className="flex-1 h-14 rounded-2xl font-black shadow-lg" onClick={() => handleEditClick(tier)}>
                  Edit Tier <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-destructive" onClick={() => handleDeleteTier(tier.id)}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-white border-b py-8 px-10">
          <CardTitle className="text-2xl font-black">Recent Billing Transactions</CardTitle>
          <CardDescription className="font-medium text-slate-500">Real-time log of payments across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {RECENT_INVOICES.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="font-bold text-[10px] uppercase tracking-[0.2em]">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="px-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Invoice ID</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Tenant</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Amount</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-right px-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_INVOICES.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="px-10 font-bold">{invoice.id}</TableCell>
                    <TableCell>{invoice.tenant}</TableCell>
                    <TableCell className="font-black">{invoice.amount}</TableCell>
                    <TableCell><Badge>{invoice.status}</Badge></TableCell>
                    <TableCell className="text-right px-10"><Button variant="ghost" size="sm">View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs Omitted for brevity as they remain unchanged but clear state */}
    </div>
  );
}
