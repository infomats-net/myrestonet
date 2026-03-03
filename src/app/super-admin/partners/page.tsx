
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  Briefcase, 
  Globe, 
  TrendingUp, 
  Settings2,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function PartnersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    commissionRate: '10',
    country: 'United Kingdom'
  });

  const partnersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'partners');
  }, [firestore]);
  const { data: partners, isLoading } = useCollection(partnersQuery);

  useEffect(() => {
    const checkEmail = async () => {
      if (!form.email || !firestore || !form.email.includes('@')) {
        setEmailInUse(false);
        return;
      }
      setCheckingEmail(true);
      try {
        const q = query(collection(firestore, 'users'), where('email', '==', form.email.toLowerCase()));
        const snap = await getDocs(q);
        setEmailInUse(!snap.empty);
      } catch (e) {
        console.error("Email check failed", e);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [form.email, firestore]);

  const handleCreatePartner = async () => {
    if (!firestore || !form.email || !form.password || emailInUse) return;
    setLoading(true);
    let secondaryApp;

    try {
      const secondaryAppName = `partner-gen-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const partnerUid = userCredential.user.uid;

      const partnerRef = doc(firestore, 'partners', partnerUid);
      
      await setDoc(partnerRef, {
        id: partnerUid,
        name: form.name,
        email: form.email,
        country: form.country,
        commissionRate: parseFloat(form.commissionRate),
        status: 'active',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(firestore, 'users', partnerUid), {
        id: partnerUid,
        email: form.email,
        role: 'marketing_partner',
        partnerId: partnerUid,
        createdAt: serverTimestamp()
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Partner Created", description: "Reseller can now log in to their dashboard." });
      setIsNewDialogOpen(false);
      setForm({ name: '', email: '', password: '', commissionRate: '10', country: 'United Kingdom' });
    } catch (e: any) {
      if (secondaryApp) await deleteApp(secondaryApp);
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (partner: any) => {
    if (!firestore) return;
    try {
      const newStatus = partner.status === 'active' ? 'suspended' : 'active';
      await updateDoc(doc(firestore, 'partners', partner.id), { status: newStatus });
      toast({ title: "Status Updated", description: `Partner is now ${newStatus}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const filtered = partners?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" /> Marketing Partners
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Manage global reseller ecosystem and commissions.</p>
        </div>
        
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 shadow-xl"><Plus className="mr-2" /> Add Partner</Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">New Marketing Partner</DialogTitle>
              <DialogDescription>Create a secure portal for a new agency or reseller.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>Agency Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Global Marketing Inc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Admin Email</Label>
                    {checkingEmail && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    className={cn(emailInUse && "border-destructive ring-destructive bg-destructive/5")}
                  />
                  {emailInUse && (
                    <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-1 uppercase tracking-widest">
                      <AlertCircle className="h-3 w-3" /> Email already registered
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input type="number" value={form.commissionRate} onChange={e => setForm({...form, commissionRate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleCreatePartner} disabled={loading || emailInUse || checkingEmail}>
                {loading ? <Loader2 className="animate-spin" /> : "Activate Partner Portal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Partners</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black">{partners?.length || 0}</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Revenue Sharing</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black text-primary">$12,450</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg bg-primary text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-70">Top Performer</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">Horizon Growth</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
        <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search partners..." className="pl-12 h-12 bg-slate-50 border-none rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b">
              <tr>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Partner Details</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Region</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Commission</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-bold">{p.name[0]}</div>
                      <div>
                        <p className="font-black text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium text-slate-600">{p.country}</td>
                  <td className="p-6">
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-black">{p.commissionRate}%</Badge>
                  </td>
                  <td className="p-6">
                    <Badge className={p.status === 'active' ? 'bg-emerald-500' : 'bg-destructive'}>{p.status}</Badge>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(p)}>
                        {p.status === 'active' ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon"><Settings2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
