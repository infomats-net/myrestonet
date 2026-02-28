"use client";

import { useState } from 'react';
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
  Globe, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Search,
  Check,
  X,
  UtensilsCrossed,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';
import { cn } from '@/lib/utils';

const WORLD_CUISINES = [
  "Afghan", "African", "American", "Argentine", "Armenian", "Asian", "Australian", "Austrian", 
  "Bakery", "Balkan", "BBQ", "Belgian", "Brazilian", "British", "Burmese", 
  "Cajun", "Cambodian", "Caribbean", "Central Asian", "Chilean", "Chinese", "Colombian", "Creole", "Cuban", 
  "Czech", "Danish", "Deli", "Dessert", "Dutch", "Eastern European", "Ecuadorian", "Egyptian", 
  "Ethiopian", "European", "Filipino", "French", "German", "Greek", "Grill", "Guatemalan", 
  "Healthy", "Himalayan", "Hungarian", "Indian", "Indonesian", "International", "Iranian", "Irish", 
  "Israeli", "Italian", "Jamaican", "Japanese", "Jewish", "Korean", "Latin American", "Lebanese", 
  "Mediterranean", "Mexican", "Middle Eastern", "Moroccan", "Nepalese", "Nordic", "North African", 
  "Pakistani", "Persian", "Peruvian", "Pizza", "Polish", "Portuguese", "Pub", "Russian", 
  "Scandinavian", "Seafood", "Singaporean", "Southern", "Spanish", "Sri Lankan", "Steakhouse", 
  "Sushi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tapas", "Thai", "Tibetan", "Turkish", 
  "Ukrainian", "Uzbek", "Vegan", "Vegetarian", "Venezuelan", "Vietnamese", "Wine Bar"
].sort();

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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function NewTenantPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: "",
      customDomain: "",
      contactName: "",
      contactPhone: "",
      cuisine: [],
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

      await setDoc(restaurantRef, {
        id: restaurantId,
        name: values.restaurantName,
        customDomain: values.customDomain || null,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        adminUserId: adminUid,
        cuisine: values.cuisine,
        city: values.city,
        state: values.state,
        country: values.country,
        postcode: values.postcode,
        address: values.address,
        baseCurrency: values.baseCurrency,
        baseLanguage: "en",
        subscriptionStatus: "active",
        paymentSettings: {
          paypal: { enabled: false, clientId: '' },
          cod: { enabled: true }
        },
        deliverySettings: {
          deliveryEnabled: true,
          deliveryCharge: 5.00,
          freeDeliveryAbove: 50.00
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(firestore, 'users', adminUid), {
        id: adminUid,
        email: values.adminEmail,
        role: 'restaurant_admin',
        restaurantId: restaurantId,
        createdAt: serverTimestamp(),
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ 
        title: "Restaurant Initialized", 
        description: "The admin account can now log in immediately." 
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

  return (
    <div className="p-8 w-full space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm border">
            <Link href="/super-admin/tenants"><ChevronLeft /></Link>
          </Button>
          <div className="flex flex-wrap items-center gap-x-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">New Restaurant Instance</h1>
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mt-1">Configure global market parameters and tenant isolation.</p>
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Basic Information</h3>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="restaurantName" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Restaurant Name</Label>
                    <FormControl><Input placeholder="e.g. Bella Napoli" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customDomain" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Custom Domain</Label>
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
                    <Label className="font-bold text-slate-700">Contact Name</Label>
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
                    <Label className="font-bold text-slate-700">Contact Number</Label>
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
                <FormItem className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <Label className="font-bold text-slate-700">Cuisine Types</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {field.value?.map((c: string) => (
                        <Badge key={c} variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0.5">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "h-12 justify-between bg-slate-50 border-slate-100 rounded-xl text-left font-normal",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <UtensilsCrossed className="h-4 w-4 shrink-0" />
                            {field.value?.length > 0 
                              ? `${field.value.length} cuisines selected`
                              : "Select cuisine types..."}
                          </div>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 rounded-2xl border-none shadow-2xl" align="start">
                      <div className="p-4 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Search cuisines..." 
                            className="h-10 pl-10 bg-slate-50 border-none rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-72">
                        <div className="p-2 space-y-1">
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
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group",
                                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-slate-50"
                                )}
                              >
                                <Checkbox 
                                  checked={isSelected}
                                  className={cn("rounded-md", isSelected && "bg-primary border-primary")}
                                />
                                <span className="text-sm font-medium">{cuisine}</span>
                                {isSelected && <Check className="ml-auto h-4 w-4" />}
                              </div>
                            );
                          })}
                          {filteredCuisines.length === 0 && (
                            <div className="p-4 text-center text-sm text-slate-500">No cuisine found.</div>
                          )}
                        </div>
                      </ScrollArea>
                      {field.value?.length > 0 && (
                        <div className="p-4 border-t bg-slate-50/50 flex flex-wrap gap-1.5">
                          {field.value.map(c => (
                            <Badge key={c} variant="secondary" className="bg-white border-slate-100 flex items-center gap-1 py-1 px-2 rounded-lg">
                              {c}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  field.onChange(field.value.filter(v => v !== c));
                                }}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location & Payments</h3>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Country</Label>
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
                    <Label className="font-bold text-slate-700">Payment Currency</Label>
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
                    <Label className="font-bold text-slate-700">City</Label>
                    <FormControl><Input placeholder="London" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">State / Province</Label>
                    <FormControl><Input placeholder="e.g. NSW" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="postcode" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Post Code</Label>
                    <FormControl><Input placeholder="2000" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <Label className="font-bold text-slate-700">Street Address</Label>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="123 Signature Way" className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-10 py-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Credentials</h3>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <FormField control={form.control} name="adminEmail" render={({ field }) => (
                <FormItem>
                  <Label className="font-bold text-slate-700">Admin Email</Label>
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
                    <Label className="font-bold text-slate-700">Password</Label>
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
                    <Label className="font-bold text-slate-700">Confirm Password</Label>
                    <FormControl><Input type="password" placeholder="••••••••" className="h-12 bg-slate-50 border-slate-100 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Initialize Global Instance"}
          </Button>
        </form>
      </Form>
    </div>
  );
}