
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  LifeBuoy, 
  Loader2,
  Trash2,
  Settings2,
  X,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Save
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, where, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function SupportManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'support' as 'support' | 'helper',
  });

  const [assignmentForm, setAssignmentForm] = useState({
    restaurantId: '',
    permissions: ['read'] as string[],
    expiryDate: '',
  });

  const supportQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', 'in', ['support', 'helper']));
  }, [firestore]);
  const { data: supportUsers, isLoading } = useCollection(supportQuery);

  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'restaurants');
  }, [firestore]);
  const { data: restaurants } = useCollection(restaurantsQuery);

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

  const handleCreateSupport = async () => {
    if (!firestore || !form.email || !form.password || emailInUse) return;
    setLoading(true);
    let secondaryApp;

    try {
      const secondaryAppName = `support-gen-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = userCredential.user.uid;

      await setDoc(doc(firestore, 'users', uid), {
        id: uid,
        email: form.email,
        role: form.role,
        assignedRestaurants: [],
        createdAt: serverTimestamp()
      });

      // AI Welcome Email
      const emailContent = await generateEmailContent({
        type: 'welcome_support',
        recipientName: "New Support Specialist",
        details: `Login: ${form.email}`
      });

      addDoc(collection(firestore, 'mail'), {
        to: [form.email],
        message: emailContent,
        createdAt: new Date().toISOString()
      }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'mail',
          operation: 'create',
          requestResourceData: { to: [form.email] }
        }));
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Staff Account Created", description: "Internal welcome pass sent." });
      setIsNewDialogOpen(false);
      setForm({ email: '', password: '', role: 'support' });
    } catch (e: any) {
      if (secondaryApp) await deleteApp(secondaryApp);
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!firestore || !selectedStaff || !assignmentForm.restaurantId) return;
    setLoading(true);
    try {
      const currentAssignments = selectedStaff.assignedRestaurants || [];
      const updated = [
        ...currentAssignments.filter((a: any) => a.restaurantId !== assignmentForm.restaurantId),
        {
          restaurantId: assignmentForm.restaurantId,
          permissions: assignmentForm.permissions,
          expiryDate: assignmentForm.expiryDate ? new Date(assignmentForm.expiryDate).toISOString() : null,
        }
      ];
      await updateDoc(doc(firestore, 'users', selectedStaff.id), { assignedRestaurants: updated });
      toast({ title: "Assignments Updated", description: "Permissions synced successfully." });
      setIsAssignDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const filtered = supportUsers?.filter(u => u.email.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="h-8 w-8 text-primary" /> Support & Helper Staff
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Manage global internal support accounts.</p>
        </div>
        
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 shadow-xl"><Plus className="mr-2" /> Add Staff Account</Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">New Support User</DialogTitle>
              <DialogDescription>Create a managed internal account and trigger welcome pass.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Email Address</Label>
                  {checkingEmail && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  placeholder="support@myrestonet.com" 
                  className={cn(emailInUse && "border-destructive ring-destructive bg-destructive/5")}
                />
                {emailInUse && (
                  <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-1 uppercase tracking-widest">
                    <AlertCircle className="h-3 w-3" /> Email already in use
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Role Level</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="role-support" checked={form.role === 'support'} onCheckedChange={() => setForm({...form, role: 'support'})} />
                    <Label htmlFor="role-support">Support (Write Access)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="role-helper" checked={form.role === 'helper'} onCheckedChange={() => setForm({...form, role: 'helper'})} />
                    <Label htmlFor="role-helper">Helper (Read Only)</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleCreateSupport} disabled={loading || emailInUse || checkingEmail}>
                {loading ? <Loader2 className="animate-spin" /> : "Initialize Support Profile"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
        <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search staff by email..." className="pl-12 h-12 bg-slate-50 border-none rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b">
              <tr>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Account</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Role</th>
                <th className="p-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.email[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{u.email}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <Badge variant={u.role === 'support' ? 'default' : 'secondary'} className="capitalize">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="p-6">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedStaff(u); setIsAssignDialogOpen(true); }}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assign Restaurant</DialogTitle>
            <DialogDescription>Grant {selectedStaff?.email} access to a tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Select Restaurant</Label>
              <Select onValueChange={v => setAssignmentForm({...assignmentForm, restaurantId: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50"><SelectValue placeholder="Choose a restaurant..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {restaurants?.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.city})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'read', label: 'Read Only' },
                  { id: 'update_settings', label: 'Write Access' }
                ].map(p => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`perm-${p.id}`} 
                      checked={assignmentForm.permissions.includes(p.id)} 
                      onCheckedChange={(v) => {
                        const next = v 
                          ? [...assignmentForm.permissions, p.id] 
                          : assignmentForm.permissions.filter(x => x !== p.id);
                        setAssignmentForm({...assignmentForm, permissions: next});
                      }} 
                    />
                    <Label htmlFor={`perm-${p.id}`} className="text-xs">{p.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black" onClick={handleAssign} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
