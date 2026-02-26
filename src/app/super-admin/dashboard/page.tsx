
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Store, 
  CreditCard, 
  TrendingUp, 
  Plus, 
  Search, 
  MoreHorizontal, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { MOCK_RESTAURANTS, Restaurant } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [search, setSearch] = useState('');

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Global Overview</h1>
          <p className="text-muted-foreground">Platform-wide performance and restaurant management.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 h-4 w-4" /> Create Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Restaurant Tenant</DialogTitle>
              <DialogDescription>
                Create a new restaurant profile and assign an initial administrator.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" className="col-span-3" placeholder="Gino's Pizzeria" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="admin-email" className="text-right">Admin Email</Label>
                <Input id="admin-email" className="col-span-3" placeholder="gino@example.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Location</Label>
                <Input id="location" className="col-span-3" placeholder="New York, USA" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tier" className="text-right">Tier</Label>
                <select id="tier" className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>Basic</option>
                  <option>Pro</option>
                  <option>Enterprise</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Deploy Instance</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$124,563.00</div>
            <p className="text-xs text-accent font-semibold">+12.5% from last month</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Restaurants</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-accent font-semibold">+4 new this week</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,234</div>
            <p className="text-xs text-muted-foreground">Active platform-wide</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-destructive font-semibold">-0.4% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Restaurant Tenants</CardTitle>
            <CardDescription>Manage restaurant isolation and role-based access.</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by name or email..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead>Restaurant Name</TableHead>
              <TableHead>Admin Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRestaurants.map((res) => (
              <TableRow key={res.id}>
                <TableCell className="font-medium">{res.name}</TableCell>
                <TableCell>{res.adminEmail}</TableCell>
                <TableCell>{res.location}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{res.subscriptionTier}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={res.status === 'active' ? 'bg-accent/20 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/10'}>
                    {res.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => window.open(`/restaurant-admin/dashboard?impersonate=${res.id}`)}>
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
