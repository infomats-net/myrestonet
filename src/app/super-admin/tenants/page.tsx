"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  ShieldAlert,
  Store,
  Globe,
  Mail,
  Settings,
  MapPin,
  Info,
  ChevronRight
} from 'lucide-react';
import { MOCK_RESTAURANTS, Restaurant } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';

export default function TenantsPage() {
  const [restaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
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
          <p className="text-muted-foreground">Manage multi-tenant isolation, domains, and subscriptions.</p>
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
            <CardDescription>Managing {filteredRestaurants.length} tenant instances.</CardDescription>
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
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            {filteredRestaurants.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No restaurants found matching your search.</p>
              </div>
            ) : (
              filteredRestaurants.map((res) => (
                <AccordionItem key={res.id} value={res.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-6 py-4 transition-colors hover:bg-muted/30">
                    <div className="flex flex-1 items-center justify-between text-left pr-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2.5 rounded-xl hidden sm:block">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{res.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {res.location}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center gap-4">
                         {res.customDomain && (
                           <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-medium">
                             <Globe className="h-3 w-3 mr-1" />
                             {res.customDomain}
                           </Badge>
                         )}
                         <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider">
                           {res.subscriptionTier}
                         </Badge>
                         <Badge className={res.status === 'active' ? 'bg-accent/20 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/10'}>
                           {res.status}
                         </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-4 bg-muted/5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Detailed Info Column */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Basic Information
                          </h4>
                          <div className="space-y-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Cuisine Style</span>
                              <span className="text-sm font-semibold">{res.cuisineType}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Admin Email</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{res.adminEmail}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" asChild title="Send Email">
                                  <a href={`mailto:${res.adminEmail}`}>
                                    <Mail className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Platform Identity</h4>
                          <div className="bg-white p-3 rounded-lg border border-dashed border-primary/20 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Tenant ID</span>
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{res.id}</code>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Subscription</span>
                              <span className="font-bold text-primary capitalize">{res.subscriptionTier}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Location & Description Column */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> Location Details
                          </h4>
                          <div className="p-4 bg-white rounded-xl border shadow-sm">
                            <p className="text-sm font-medium leading-relaxed">{res.address}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Restaurant Description</h4>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            "{res.description}"
                          </p>
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex flex-col gap-3 justify-center">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Administrative Actions</h4>
                        <Button className="w-full justify-start h-12 bg-primary hover:bg-primary/90 shadow-md group" onClick={() => window.open(`/restaurant-admin/dashboard?impersonate=${res.id}`)}>
                          <ShieldAlert className="mr-3 h-5 w-5" /> 
                          <div className="text-left">
                            <p className="font-bold text-sm">Impersonate Admin</p>
                            <p className="text-[10px] opacity-80">Access dashboard as restaurant manager</p>
                          </div>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button variant="outline" className="w-full justify-start h-12 border-primary/20 hover:bg-primary/5" asChild>
                          <a href={`mailto:${res.adminEmail}`}>
                            <Mail className="mr-3 h-5 w-5 text-primary" />
                            <div className="text-left">
                              <p className="font-bold text-sm">Contact Tenant</p>
                              <p className="text-[10px] text-muted-foreground">Send direct support email</p>
                            </div>
                          </a>
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-primary">
                          <Settings className="mr-3 h-5 w-5" />
                          <div className="text-left">
                            <p className="font-bold text-sm">Settings & Config</p>
                            <p className="text-[10px]">Modify tenant specific parameters</p>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
