
"use client";

import { useEffect, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Search,
  ChevronsUpDown,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';
import { MOCK_RESTAURANTS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const CUISINES = [
  "Afghan", "African", "American", "Arabic", "Argentine", "Armenian", "Asian", "Australian", "Austrian", "Azerbaijani",
  "Bangladeshi", "Belgian", "Brazilian", "British", "Burmese", "Cajun", "Cambodian", "Caribbean", "Chinese", "Colombian",
  "Cuban", "Czech", "Danish", "Eastern European", "Egyptian", "Ethiopian", "Filipino", "French", "Georgian", "German",
  "Greek", "Guatemalan", "Hungarian", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian",
  "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Korean", "Lebanese", "Malaysian", "Mediterranean", "Mexican",
  "Middle Eastern", "Moroccan", "Nepalese", "Nigerian", "North African", "Norwegian", "Pakistani", "Palestinian", "Persian", "Peruvian",
  "Polish", "Portuguese", "Russian", "Saudi Arabian", "Scandinavian", "Scottish", "South African", "South American", "Spanish", "Sri Lankan",
  "Swedish", "Swiss", "Syrian", "Taiwanese", "Thai", "Tibetan", "Turkish", "Ukrainian", "Uzbek", "Vietnamese"
].sort();

const formSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters"),
  customDomain: z.string().optional(),
  contactName: z.string().min(2, "Contact name is required"),
  contactNumber: z.string().optional(),
  cuisine: z.array(z.string()).min(1, "Please select at least one cuisine type"),
  country: z.string().min(1, "Please select a country"),
  currency: z.string().min(1, "Please select a currency"),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  address: z.string().optional(),
  adminEmail: z.string()
    .email("Invalid email address")
    .refine((email) => {
      return !MOCK_RESTAURANTS.some(r => r.adminEmail.toLowerCase() === email.toLowerCase());
    }, { message: "This email is already registered to another tenant" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function NewTenantPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      restaurantName: "",
      customDomain: "",
      contactName: "",
      contactNumber: "",
      cuisine: [],
      country: "Australia",
      currency: "AUD",
      city: "",
      state: "",
      postcode: "",
      address: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  const selectedCountry = form.watch("country");
  const selectedCuisines = form.watch("cuisine");

  useEffect(() => {
    const countryData = WORLD_COUNTRIES.find(c => c.name === selectedCountry);
    if (countryData) {
      form.setValue("currency", countryData.currency);
    }
  }, [selectedCountry, form]);

  const filteredCuisines = CUISINES.filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Initializing tenant:", values);
    router.push('/super-admin/tenants');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/super-admin/tenants">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Restaurant Profile</h1>
          <p className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
            Core details and global market configuration
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-12">
          <Card className="border-none shadow-xl">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Core Details</CardTitle>
                  <CardDescription>Primary identification for the restaurant</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="restaurantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Gino's Pizzeria" {...field} />
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
                      <FormLabel>Custom Domain</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="pizzaplace.com" {...field} />
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
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="John Doe" {...field} />
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
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="+61 400 000 000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Cuisine Types</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {field.value.map((c) => (
                          <Badge key={c} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                            {c}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => field.onChange(field.value.filter(v => v !== c))}
                            />
                          </Badge>
                        ))}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value?.length && "text-muted-foreground"
                              )}
                            >
                              {field.value?.length > 0
                                ? `${field.value.length} cuisines selected`
                                : "Search and select cuisines..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-none" align="start">
                          <div className="p-3 border-b bg-muted/20">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Filter cuisines..." 
                                className="pl-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                          </div>
                          <ScrollArea className="h-[300px]">
                            <div className="p-2 space-y-1">
                              {filteredCuisines.length === 0 ? (
                                <p className="text-center py-6 text-sm text-muted-foreground">No cuisine found.</p>
                              ) : (
                                filteredCuisines.map((cuisine) => {
                                  const isSelected = field.value?.includes(cuisine);
                                  return (
                                    <div 
                                      key={cuisine} 
                                      className={cn(
                                        "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer hover:bg-accent",
                                        isSelected && "bg-primary/5"
                                      )}
                                      onClick={() => {
                                        const newValue = isSelected
                                          ? field.value?.filter((v) => v !== cuisine)
                                          : [...(field.value || []), cuisine];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {}} // Handled by div click
                                      />
                                      <span className="text-sm flex-1">{cuisine}</span>
                                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                  );
                                })
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
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Location & Payments</CardTitle>
                  <CardDescription>Regional settings and financial configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {WORLD_COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.name}>
                              {c.name}
                            </SelectItem>
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
                      <FormLabel>Payment Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {WORLD_CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} ({curr.symbol})
                            </SelectItem>
                          ))}
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Sydney" {...field} />
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
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input placeholder="NSW" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Code</FormLabel>
                      <FormControl>
                        <Input placeholder="2000" {...field} />
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
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 George St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Admin Credentials</CardTitle>
                  <CardDescription>Security settings for the restaurant administrator</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="admin@example.com" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" className="pl-9" placeholder="••••••••" {...field} />
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
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-12" asChild>
              <Link href="/super-admin/tenants">Cancel</Link>
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 h-12 text-lg font-semibold rounded-lg shadow-md">
              Initialize Restaurant
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
