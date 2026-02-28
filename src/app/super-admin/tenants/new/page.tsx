
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name is required"),
  adminEmail: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
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
      adminEmail: "",
      password: "",
      city: "",
      country: "United States",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setLoading(true);

    let secondaryApp;
    try {
      // 1. Create a unique secondary app to register the tenant admin without logging out current super admin
      const secondaryAppName = `tenant-gen-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.adminEmail, values.password);
      const adminUid = userCredential.user.uid;

      // 2. Generate a new restaurant ID
      const restaurantRef = doc(collection(firestore, 'restaurants'));
      const restaurantId = restaurantRef.id;

      // 3. Create Restaurant Document (Target structure)
      await setDoc(restaurantRef, {
        id: restaurantId,
        name: values.restaurantName,
        adminUserId: adminUid,
        city: values.city,
        country: values.country,
        baseCurrency: "USD",
        baseLanguage: "en",
        subscriptionStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Create User Document with Mapping (Target structure)
      await setDoc(doc(firestore, 'users', adminUid), {
        id: adminUid,
        email: values.adminEmail,
        role: 'restaurant_admin',
        restaurantId: restaurantId,
        createdAt: new Date().toISOString(),
      });

      // Cleanup secondary app
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Tenant Initialized", description: `${values.restaurantName} has been created successfully.` });
      router.push('/super-admin/tenants');
    } catch (error: any) {
      if (secondaryApp) await deleteApp(secondaryApp);
      toast({ 
        variant: "destructive", 
        title: "Setup Failed", 
        description: error.message || "Could not initialize tenant." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/super-admin/tenants"><ChevronLeft /></Link></Button>
        <h1 className="text-3xl font-bold">New Restaurant Tenant</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6 space-y-4">
            <FormField control={form.control} name="restaurantName" render={({ field }) => (
              <FormItem><FormLabel>Restaurant Name</FormLabel><FormControl><Input placeholder="e.g. Bella Napoli" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="London" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="United Kingdom" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b pb-2">Admin Credentials</h3>
            <FormField control={form.control} name="adminEmail" render={({ field }) => (
              <FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input type="email" placeholder="admin@restaurant.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Secure Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </Card>

          <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Initialize Restaurant Instance"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
