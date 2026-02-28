
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Loader2, Globe, User, Phone, Mail, Lock, MapPin, Coins } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';

const CUISINES = [
  "Italian", "Japanese", "French", "Mexican", "Chinese", "Indian", "American", "Mediterranean", "Thai", "Steakhouse", "Seafood", "Vegan", "Bakery"
];

const formSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name is required"),
  customDomain: z.string().optional(),
  contactName: z.string().min(2, "Contact name is required"),
  contactPhone: z.string().min(5, "Contact number is required"),
  cuisine: z.string().min(1, "Please select a primary cuisine"),
  country: z.string().min(1, "Country is required"),
  baseCurrency: z.string().min(1, "Currency is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postcode: z.string().min(1, "Post code is required"),
  address: z.string().min(1, "Street address is required"),
  adminEmail: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function NewTenantPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: "",
      customDomain: "",
      contactName: "",
      contactPhone: "",
      cuisine: "",
      country: "United States",
      baseCurrency: "USD",
      city: "",
      state: "",
      postcode: "",
      address: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
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

      // Default settings for new tenants
      await setDoc(restaurantRef, {
        id: restaurantId,
        name: values.restaurantName,
        customDomain: values.customDomain || null,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        adminUserId: adminUid,
        cuisine: [values.cuisine],
        city: values.city,
        state: values.state,
        country: values.country,
        postcode: values.postcode,
        address: values.address,
        baseCurrency: values.baseCurrency,
        baseLanguage: "en",
        subscriptionStatus: "active",
        paymentSettings: {
          stripe: { enabled: false, publishableKey: '', accountId: '' },
          paypal: { enabled: false, clientId: '' },
          cod: { enabled: true }
        },
        deliverySettings: {
          deliveryEnabled: true,
          deliveryCharge: 5.00,
          freeDeliveryAbove: 50.00
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(firestore, 'users', adminUid), {
        id: adminUid,
        email: values.adminEmail,
        role: 'restaurant_admin',
        restaurantId: restaurantId,
        createdAt: new Date().toISOString(),
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Tenant Created", description: "Restaurant instance initialized." });
      router.push('/super-admin/tenants');
    } catch (error: any) {
      if (secondaryApp) await deleteApp(secondaryApp);
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 w-full space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm border"><Link href="/super-admin/tenants"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Restaurant Profile</h1>
          <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mt-1">Core details and global market configuration.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Restaurant Profile Section */}
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardContent className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="restaurantName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Restaurant Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Bella Napoli" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customDomain" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Custom Domain</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="pizzaplace.com" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Contact Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="John Doe" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Contact Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="+1 (555) 000-0000" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="cuisine" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">Cuisine Types</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl">
                        <SelectValue placeholder="Select cuisines" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      {CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Location & Payments Section */}
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location & Payments</h3>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl">
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {WORLD_COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="baseCurrency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Payment Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl">
                          <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {WORLD_CURRENCIES.map(curr => <SelectItem key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">City</FormLabel>
                    <FormControl><Input placeholder="London" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">State / Province</FormLabel>
                    <FormControl><Input placeholder="e.g. NSW" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="postcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Post Code</FormLabel>
                    <FormControl><Input placeholder="2000" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Street Address</FormLabel>
                    <FormControl><Input placeholder="123 Signature Way" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Admin Credentials Section */}
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Credentials</h3>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <FormField control={form.control} name="adminEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">Admin Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input type="email" placeholder="admin@restaurant.com" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="password" placeholder="••••••••" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Confirm Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Initialize Restaurant"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
