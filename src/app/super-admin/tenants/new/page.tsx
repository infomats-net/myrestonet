
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  ChevronLeft,
  Store,
  CreditCard,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { WORLD_COUNTRIES, WORLD_CURRENCIES } from '@/lib/countries-data';

export default function NewTenantPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState('Australia');
  const [selectedCurrency, setSelectedCurrency] = useState('AUD');

  // Automatically update currency when country changes
  useEffect(() => {
    const countryData = WORLD_COUNTRIES.find(c => c.name === selectedCountry);
    if (countryData) {
      setSelectedCurrency(countryData.currency);
    }
  }, [selectedCountry]);

  const handleInitialize = (e: React.FormEvent) => {
    e.preventDefault();
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

      <form onSubmit={handleInitialize} className="space-y-8">
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
              <div className="space-y-2">
                <Label htmlFor="rest-name">Restaurant Name</Label>
                <Input id="rest-name" placeholder="Gino's Pizzeria" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Custom Domain</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="custom-domain" className="pl-9" placeholder="pizzaplace.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="contact-name" className="pl-9" placeholder="John Doe" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-number">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="contact-number" className="pl-9" placeholder="+61 400 000 000" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cuisine">Cuisine Types</Label>
                <Select>
                  <SelectTrigger id="cuisine">
                    <SelectValue placeholder="Select cuisines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="japanese">Japanese</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="thai">Thai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Payment Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} ({curr.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Sydney" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input id="state" placeholder="NSW" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Post Code</Label>
                <Input id="postcode" placeholder="2000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" placeholder="123 George St" />
              </div>
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-email" type="email" className="pl-9" placeholder="admin@example.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-9 pr-9" placeholder="••••••••" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" required />
              </div>
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
    </div>
  );
}
