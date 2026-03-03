
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Search,
  UtensilsCrossed,
  MapPin,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';
import { WORLD_CUISINES } from '@/lib/cuisines-data';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateEmailContent } from '@/ai/flows/generate-email-content';

const formSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name is required"),
  customDomain: z.string().optional(),
  contactName: z.string().min(2, "Contact name is required"),
  contactPhone: z.string().min(5, "Contact number is required"),
  cuisine: z.array(z.string()).min(1, "Please select at least one cuisine"),
  country: z.string().min(1, "Country is required"),
  baseCurrency: z.string().min(1, "Currency is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postcode: z.string().min(1, "Post code is required"),
  address: z.string().min(1, "Street address is required"),
  adminEmail: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  partnerId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function NewTenantPage() {
  const router = useRouter();
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailInUse, setEmailInUse] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid) return null;
    return doc(firestore, 'users', currentUser.uid);
  }, [firestore, currentUser?.uid]);
  const { data: profile } = useDoc(userProfileRef);

  const partnerRef = useMemoFirebase(() => {
    if (!firestore || profile?.role !== 'marketing_partner' || !profile?.partnerId) return null;
    return doc(firestore, 'partners', profile.partnerId);
  }, [firestore, profile]);
  const { data: partnerData } = useDoc(partnerRef);

  const partnersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'partners');
  }, [firestore]);
  const { data: partners } = useCollection(partnersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      restaurantName: "",
      customDomain: "",
      contactName: "",
      contactPhone: "",
      cuisine: [],
      country: "Australia",
      baseCurrency: "AUD",
      city: "",
      state: "",
      postcode: "",
      address: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
      partnerId: "",
    },
  });

  const adminEmail = form.watch('adminEmail');
  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const selectedCountry = form.watch('country');

  useEffect(() => {
    if (profile?.role === 'marketing_partner' && partnerData?.country) {
      form.setValue('country', partnerData.country, { shouldValidate: true });
    }
  }, [profile, partnerData, form]);

  useEffect(() => {
    if (selectedCountry) {
      const countryData = WORLD_COUNTRIES.find(c => c.name === selectedCountry);
      if (countryData) {
        form.setValue('baseCurrency', countryData.currency, { shouldValidate: true });
      }
    }
  }, [selectedCountry, form]);

  useEffect(() => {
    const checkEmail = async () => {
      if (!adminEmail || !firestore || !adminEmail.includes('@')) {
        setEmailInUse(false);
        return;
      }
      setCheckingEmail(true);
      try {
        const q = query(collection(firestore, 'users'), where('email', '==', adminEmail.toLowerCase()));
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
  }, [adminEmail, firestore]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || emailInUse) return;
    setLoading(true);

    let secondaryApp;
    try {
      const secondaryAppName = `tenant-gen-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.adminEmail, values.password);
      const adminUid = userCredential.user.uid;

      const restaurantRef = doc(collection(firestore, 'restaurants'));
      const restaurantId = restaurantRef.id;

      let finalPartnerId = null;
      if (profile?.role === 'marketing_partner') {
        finalPartnerId = profile.partnerId || currentUser?.uid || null;
      } else if (values.partnerId && values.partnerId !== 'none') {
        finalPartnerId = values.partnerId;
      }

      const restaurantData = {
        id: restaurantId,
        name: values.restaurantName,
        customDomain: values.customDomain || null,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        adminUserId: adminUid,
        adminEmail: values.adminEmail.toLowerCase(),
        partnerId: finalPartnerId,
        cuisine: values.cuisine,
        city: values.city,
        state: values.state,
        country: values.country,
        postcode: values.postcode,
        address: values.address,
        baseCurrency: values.baseCurrency,
        baseLanguage: "en",
        subscriptionStatus: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const userProfileData = {
        id: adminUid,
        email: values.adminEmail.toLowerCase(),
        role: 'restaurant_admin',
        restaurantId: restaurantId,
        partnerId: finalPartnerId,
        createdAt: serverTimestamp(),
      };

      setDoc(restaurantRef, restaurantData)
        .then(async () => {
          // Trigger Welcome Email
          const content = await generateEmailContent({
            type: 'welcome_admin',
            recipientName: values.contactName,
            restaurantName: values.restaurantName,
            details: `Portal URL: https://myrestonet.app/auth/login, Email: ${values.adminEmail}`
          });

          addDoc(collection(firestore, 'mail'), {
            to: [values.adminEmail],
            message: content,
            createdAt: new Date().toISOString()
          }).catch(async (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: 'mail',
              operation: 'create',
              requestResourceData: { to: [values.adminEmail] }
            }));
          });
        })
        .catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: restaurantRef.path,
            operation: 'create',
            requestResourceData: restaurantData,
          }));
        });

      const userDocRef = doc(firestore, 'users', adminUid);
      setDoc(userDocRef, userProfileData).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: userProfileData,
        }));
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ 
        title: "Initializing Restaurant...", 
        description: "Provisioning instance and sending welcome pass." 
      });
      
      router.push('/super-admin/tenants');
    } catch (error: any) {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch(e) {}
      }
      toast({ 
        variant: "destructive", 
        title: "Setup Failed", 
        description: error.message || "An error occurred during restaurant initialization." 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCuisines = WORLD_CUISINES.filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPartner = profile?.role === 'marketing_partner';

  return (
    <div className="p-8 w-full space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm border">
            <Link href="/super-admin/tenants"><ChevronLeft /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">New Restaurant Instance</h1>
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mt-1">
              {isPartner ? `Region Locked: ${partnerData?.country || 'Detecting...'}` : 'Tenant isolation and global market parameters.'}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden h-fit">
              <CardHeader className="bg-slate-50/50 border-b px-10 py-8 flex flex-row items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Restaurant Profile</h3>
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                  {form.watch('cuisine')?.map((c: string) => (
                    <Badge key={c} variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-bold">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <FormField control={form.control} name="restaurantName" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Business Name</Label>
                    <FormControl><Input placeholder="e.g. Bella Napoli" className="h-14 bg-slate-50 border-slate-100 rounded-2xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem>
                      <Label className="font-bold text-slate-700">Contact Person</Label>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Manager Name" className="h-14 bg-slate-50 border-slate-100 rounded-2xl pl-12" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem>
                      <Label className="font-bold text-slate-700">Phone</Label>
                      <FormControl>
                        <div className="relative">
                           Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="+1..." className="h-14 bg-slate-50 border-slate-100 rounded-2xl pl-12" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="cuisine" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Label className="font-bold text-slate-700 mb-2">Cuisine Types</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="h-14 justify-between bg-slate-50 border-slate-100 rounded-2xl font-medium">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4 text-slate-400" />
                              {field.value?.length > 0 ? `${field.value.length} selected` : "Select cuisines..."}
                            </div>
                            <Search className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-2xl" align="start">
                        <div className="p-4 border-b">
                          <Input 
                            placeholder="Search cuisines..." 
                            className="bg-slate-50 border-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-72">
                          <div className="p-2">
                            {filteredCuisines.map((cuisine) => {
                              const isSelected = field.value?.includes(cuisine);
                              return (
                                <div
                                  key={cuisine}
                                  onClick={() => {
                                    const newValue = isSelected
                                      ? field.value?.filter((v) => v !== cuisine)
                                      : [...(field.value || []), cuisine];
                                    field.onChange(newValue);
                                  }}
                                  className={cn("flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50", isSelected && "bg-primary/5 text-primary")}
                                >
                                  <Checkbox checked={isSelected} className="rounded-md" />
                                  <span className="text-sm font-medium">{cuisine}</span>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )} />

                {!isPartner && (
                  <FormField control={form.control} name="partnerId" render={({ field }) => (
                    <FormItem>
                      <Label className="font-bold text-slate-700">Assigned Marketing Partner</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl">
                            <SelectValue placeholder="Direct (No Partner)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="none">Direct Onboarding</SelectItem>
                          {partners?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.commissionRate}%)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden h-fit">
                <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Location & Billing</h3>
                </CardHeader>
                <CardContent className="p-10 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">Country</Label>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value} 
                          value={field.value}
                          disabled={isPartner}
                        >
                          <FormControl><SelectTrigger className={cn("h-12 rounded-xl bg-slate-50 border-slate-100", isPartner && "opacity-70")}><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl">
                            {WORLD_COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="baseCurrency" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">Currency</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl">
                            {WORLD_CURRENCIES.map(curr => <SelectItem key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">City</Label>
                        <FormControl><Input className="h-12 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">State/Province</Label>
                        <FormControl><Input className="h-12 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="postcode" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">Postal Code</Label>
                        <FormControl><Input className="h-12 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <Label className="font-bold text-slate-700">Street Address</Label>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input className="h-12 rounded-xl bg-slate-50 border-slate-100 pl-12" {...field} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden h-fit">
                <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Admin Credentials</h3>
                </CardHeader>
                <CardContent className="p-10 space-y-6">
                  <FormField control={form.control} name="adminEmail" render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="font-bold text-slate-700">Email Address</Label>
                        {checkingEmail && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            type="email" 
                            className={cn(
                              "h-12 rounded-xl bg-slate-50 border-slate-100 pl-12 transition-colors",
                              emailInUse && "border-destructive ring-destructive bg-destructive/5"
                            )} 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      {emailInUse && (
                        <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-1 uppercase tracking-widest">
                          <AlertCircle className="h-3 w-3" /> Email is already in use
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <Label className="font-bold text-slate-700">Password</Label>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="password" className="h-12 rounded-xl bg-slate-50 border-slate-100 pl-12" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="font-bold text-slate-700">Confirm</Label>
                          {confirmPassword && confirmPassword === password && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Match
                            </span>
                          )}
                        </div>
                        <FormControl><Input type="password" className="h-12 rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full h-20 text-xl font-black rounded-[1.5rem] shadow-2xl" disabled={loading || emailInUse || checkingEmail || !form.formState.isValid}>
                {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Initialize Tenant Instance"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
