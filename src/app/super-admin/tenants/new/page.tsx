"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Globe, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ChevronLeft,
  Store,
  MapPin,
  Loader2,
  Eye,
  EyeOff,
  Search,
  Check,
  ChevronsUpDown,
  X
} from 'lucide-react';
import Link from 'next/link';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';
import { useFirebase } from '@/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CUISINE_TYPES = [
  "Afghan", "African", "American", "Argentinian", "Asian", "Australian", "Austrian", "Bakery", "Barbecue", "Belgian", "Brazilian", "British", "Burmese", "Cafe", "Cajun", "Caribbean", "Chinese", "Colombian", "Contemporary", "Creole", "Cuban", "Czech", "Danish", "Dessert", "Dim Sum", "Eastern European", "Egyptian", "Ethiopian", "European", "Fast Food", "Filipino", "French", "Fusion", "German", "Greek", "Grill", "Hawaiian", "Healthy", "Hungarian", "Indian", "Indonesian", "International", "Irish", "Italian", "Jamaican", "Japanese", "Jewish", "Korean", "Latin American", "Lebanese", "Malaysian", "Mediterranean", "Mexican", "Middle Eastern", "Modern Australian", "Moroccan", "Nepalese", "North African", "Pakistani", "Persian", "Peruvian", "Pizza", "Polish", "Portuguese", "Pub", "Russian", "Scandinavian", "Seafood", "Singaporean", "South American", "South Indian", "Spanish", "Sri Lankan", "Steakhouse", "Sushi", "Swiss", "Taiwanese", "Tapas", "Thai", "Tibetan", "Turkish", "Vegan", "Vegetarian", "Vietnamese"
].sort();

const AU_STATES = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"
];

const formSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters"),
  customDomain: z.string().optional(),
  contactName: z.string().min(2, "Contact name is required"),
  contactNumber: z.string().optional(),
  cuisine: z.array(z.string()).min(1, "Please select at least one cuisine type"),
  country: z.string().min(1, "Please select a country"),
  currency: z.string().min(1, "Please select a currency"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postcode: z.string().min(3, "Post code is required"),
  address: z.string().min(5, "Street address is required"),
  adminEmail: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function NewTenantPage() {
  const router = useRouter();
  const { firestore, auth } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cuisineSearch, setCuisineSearch] = useState("");
  const [isCuisineOpen, setIsCuisineOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: "",
      customDomain: "",
      contactName: "",
      contactNumber: "",
      cuisine: [],
      country: "Australia",
      currency: "AUD",
      city: "",
      state: "NSW",
      postcode: "",
      address: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedCountry = form.watch("country");
  const selectedCuisines = form.watch("cuisine");

  const filteredCuisines = useMemo(() => {
    return CUISINE_TYPES.filter(c => 
      c.toLowerCase().includes(cuisineSearch.toLowerCase())
    );
  }, [cuisineSearch]);

  useEffect(() => {
    if (watchedCountry) {
      const countryData = WORLD_COUNTRIES.find(c => c.name === watchedCountry);
      if (countryData) {
        form.setValue("currency", countryData.currency);
      }
    }
  }, [watchedCountry, form]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !auth) return;
    setLoading(true);

    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("email", "==", values.adminEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        form.setError("adminEmail", { message: "This email id is already in use" });
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, values.adminEmail, values.password);
      const adminUid = userCredential.user.uid;

      const restaurantRef = doc(collection(firestore, 'restaurants'));
      const restaurantId = restaurantRef.id;

      const restaurantData = {
        id: restaurantId,
        name: values.restaurantName,
        address: values.address,
        city: values.city,
        state: values.state,
        postcode: values.postcode,
        contactEmail: values.adminEmail,
        contactPhone: values.contactNumber,
        baseLanguage: "en",
        baseCurrency: values.currency,
        adminUserId: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customDomain: values.customDomain || null,
        country: values.country,
        cuisine: values.cuisine
      };

      await setDoc(restaurantRef, restaurantData);

      await setDoc(doc(firestore, 'users', adminUid), {
        id: adminUid,
        email: values.adminEmail,
        name: values.contactName,
        role: 'RestaurantAdmin',
        restaurantId: restaurantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Restaurant Initialized",
        description: `${values.restaurantName} has been onboarded successfully.`,
      });

      router.push('/super-admin/tenants');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create restaurant tenant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    const current = form.getValues("cuisine");
    if (current.includes(cuisine)) {
      form.setValue("cuisine", current.filter(c => c !== cuisine), { shouldValidate: true });
    } else {
      form.setValue("cuisine", [...current, cuisine], { shouldValidate: true });
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 bg-background">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/super-admin/tenants">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Restaurant Profile</h1>
          <p className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
            CORE DETAILS AND GLOBAL MARKET CONFIGURATION.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 pb-12">
          {/* SECTION 1: CORE DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField
              control={form.control}
              name="restaurantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm text-primary">Restaurant Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 bg-muted/20" placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm text-primary">Custom Domain</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="h-11 pl-10 bg-muted/20" placeholder="pizzaplace.com" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm text-primary">Contact Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="h-11 pl-10 bg-muted/20" placeholder="" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm text-primary">Contact Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="h-11 pl-10 bg-muted/20" placeholder="" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Multi-select Searchable Cuisines */}
            <FormField
              control={form.control}
              name="cuisine"
              render={() => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="font-bold text-sm text-primary">Cuisine Types</FormLabel>
                  <Popover open={isCuisineOpen} onOpenChange={setIsCuisineOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isCuisineOpen}
                          className={cn(
                            "w-full justify-between h-auto min-h-11 bg-muted/20 text-left font-normal py-2",
                            selectedCuisines.length === 0 && "text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-wrap gap-1">
                            {selectedCuisines.length > 0 ? (
                              selectedCuisines.map((c) => (
                                <Badge key={c} variant="secondary" className="mr-1 h-6">
                                  {c}
                                  <span 
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCuisine(c);
                                    }}
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </span>
                                </Badge>
                              ))
                            ) : (
                              "Select cuisines..."
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Search cuisines..."
                          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={cuisineSearch}
                          onChange={(e) => setCuisineSearch(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-[300px] p-2">
                        <div className="space-y-1">
                          {filteredCuisines.length === 0 ? (
                            <p className="p-4 text-center text-sm text-muted-foreground">No cuisine found.</p>
                          ) : (
                            filteredCuisines.map((cuisine) => (
                              <div
                                key={cuisine}
                                className={cn(
                                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                  selectedCuisines.includes(cuisine) && "bg-accent/50"
                                )}
                                onClick={() => toggleCuisine(cuisine)}
                              >
                                <Checkbox 
                                  checked={selectedCuisines.includes(cuisine)}
                                  className="mr-2"
                                  onCheckedChange={() => toggleCuisine(cuisine)}
                                />
                                {cuisine}
                                {selectedCuisines.includes(cuisine) && (
                                  <Check className="ml-auto h-4 w-4 opacity-70" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* SECTION 2: LOCATION & PAYMENTS */}
          <div className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8">
              LOCATION & PAYMENTS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-muted/20">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORLD_COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Payment Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-muted/20">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORLD_CURRENCIES.map((curr) => {
                          const label = `${WORLD_COUNTRIES.find(c => c.currency === curr.code)?.currency || curr.code} (${curr.symbol})`;
                          return (
                            <SelectItem key={curr.code} value={curr.code}>{label}</SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">City</FormLabel>
                    <FormControl>
                      <Input className="h-11 bg-muted/20" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">State / Province</FormLabel>
                    {watchedCountry === "Australia" ? (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-muted/20">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AU_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input className="h-11 bg-muted/20" placeholder="" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Post Code</FormLabel>
                    <FormControl>
                      <Input className="h-11 bg-muted/20" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Street Address</FormLabel>
                    <FormControl>
                      <Input className="h-11 bg-muted/20" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* SECTION 3: ADMIN CREDENTIALS */}
          <div className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8">
              ADMIN CREDENTIALS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-sm text-primary">Admin Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="h-11 pl-10 bg-muted/20" placeholder="itwiz@hotmail.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          className="h-11 px-10 bg-muted/20" 
                          placeholder="••••••••" 
                          {...field} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-sm text-primary">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" className="h-11 bg-muted/20" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg rounded-xl" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Initialize Restaurant"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
