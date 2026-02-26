
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ShieldAlert,
  Store,
  Globe,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  ChevronDown
} from 'lucide-react';
import { MOCK_RESTAURANTS, Restaurant } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TenantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [search, setSearch] = useState('');

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <Store className="h-8 w-8" /> Restaurant Tenants
          </h1>
          <p className="text-muted-foreground">Manage multi-tenant isolation and subscription statuses.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Create Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-white p-6 md:p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold">Restaurant Profile</DialogTitle>
                <DialogDescription className="uppercase text-[10px] tracking-widest font-bold text-muted-foreground/60">
                  Core details and global market configuration.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-8 py-2">
                  {/* Core Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="rest-name">Restaurant Name</Label>
                      <Input id="rest-name" placeholder="Gino's Pizzeria" />
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
                        <Input id="contact-name" className="pl-9" placeholder="John Doe" />
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location & Payments Section */}
                  <div className="space-y-6">
                    <h3 className="uppercase text-[10px] tracking-widest font-bold text-muted-foreground/60 border-b pb-2">
                      Location & Payments
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select defaultValue="australia">
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="australia">Australia</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="usa">USA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Payment Currency</Label>
                        <Select defaultValue="aud">
                          <SelectTrigger id="currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aud">Australian Dollar ($)</SelectItem>
                            <SelectItem value="gbp">British Pound (£)</SelectItem>
                            <SelectItem value="usd">US Dollar ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="Sydney" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Select defaultValue="nsw">
                          <SelectTrigger id="state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nsw">NSW</SelectItem>
                            <SelectItem value="vic">VIC</SelectItem>
                            <SelectItem value="qld">QLD</SelectItem>
                          </SelectContent>
                        </Select>
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
                  </div>

                  {/* Admin Credentials Section */}
                  <div className="space-y-6">
                    <h3 className="uppercase text-[10px] tracking-widest font-bold text-muted-foreground/60 border-b pb-2">
                      Admin Credentials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="admin-email">Admin Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="admin-email" className="pl-9" placeholder="itwiz@hotmail.com" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type="password" className="pl-9 pr-9" placeholder="••••••••" />
                          <Eye className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" type="password" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              
              <div className="mt-8">
                <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-semibold rounded-lg shadow-md">
                  Initialize Restaurant
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-white border-b flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div>
            <CardTitle className="font-headline">Active Subscriptions</CardTitle>
            <CardDescription>Filtering {filteredRestaurants.length} active tenants.</CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by name or email..." 
              className="pl-9 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="font-bold">Restaurant Name</TableHead>
              <TableHead className="font-bold">Admin Email</TableHead>
              <TableHead className="font-bold">Location</TableHead>
              <TableHead className="font-bold">Tier</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRestaurants.map((res) => (
              <TableRow key={res.id} className="hover:bg-accent/5">
                <TableCell className="font-medium">{res.name}</TableCell>
                <TableCell>{res.adminEmail}</TableCell>
                <TableCell>{res.location}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize px-3">{res.subscriptionTier}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={res.status === 'active' ? 'bg-accent/20 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/10'}>
                    {res.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => window.open(`/restaurant-admin/dashboard?impersonate=${res.id}`)}>
                    <ShieldAlert className="h-4 w-4 mr-1" /> Impersonate
                  </Button>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
