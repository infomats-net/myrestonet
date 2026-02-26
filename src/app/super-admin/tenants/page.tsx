
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
  Store
} from 'lucide-react';
import { MOCK_RESTAURANTS, Restaurant } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm">
          <Link href="/super-admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" /> Create Restaurant
          </Link>
        </Button>
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
