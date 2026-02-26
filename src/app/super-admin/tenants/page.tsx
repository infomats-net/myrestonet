"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
  Loader2,
  Phone,
  User,
  Calendar,
  Layers,
  Coins,
  Link as LinkIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function TenantsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [search, setSearch] = useState('');

  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'restaurants');
  }, [firestore]);

  const { data: restaurants, isLoading } = useCollection(restaurantsQuery);

  const filteredRestaurants = restaurants?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.contactEmail?.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">Loading restaurants...</p>
            </div>
          ) : (
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
                              <MapPin className="h-3 w-3" /> {res.city}, {res.country}
                            </p>
                          </div>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-4">
                           <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider">
                             {res.baseCurrency}
                           </Badge>
                           <Badge className="bg-accent/20 text-accent border-accent/20">
                             Active
                           </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-4 bg-muted/5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Section 1: Basic Information */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Basic & Contact Info
                          </h4>
                          <div className="space-y-3 bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-bold">CONTACT EMAIL</span>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-primary/60" />
                                <span className="text-sm font-semibold truncate">{res.contactEmail}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-bold">CONTACT PHONE</span>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-primary/60" />
                                <span className="text-sm font-semibold">{res.contactPhone || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-bold">CUISINES</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {res.cuisine?.map((c: string) => (
                                  <Badge key={c} variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
                                    {c}
                                  </Badge>
                                )) || <span className="text-xs text-muted-foreground italic">None listed</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Location Details */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> Location Details
                          </h4>
                          <div className="space-y-3 bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground font-bold">STREET ADDRESS</span>
                              <p className="text-sm font-medium leading-relaxed">{res.address}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold">CITY</span>
                                <span className="text-sm font-semibold">{res.city}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold">STATE</span>
                                <span className="text-sm font-semibold">{res.state}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold">POSTCODE</span>
                                <span className="text-sm font-semibold">{res.postcode}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold">COUNTRY</span>
                                <span className="text-sm font-semibold">{res.country}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Configuration & Actions */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Settings className="h-3 w-3" /> Platform Config
                          </h4>
                          <div className="space-y-3 bg-white p-4 rounded-xl border shadow-sm mb-4">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase">Domain</span>
                              </div>
                              <span className="font-semibold text-xs">{res.customDomain || 'System Default'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Coins className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase">Currency</span>
                              </div>
                              <span className="font-semibold text-xs">{res.baseCurrency}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase">Created</span>
                              </div>
                              <span className="font-semibold text-[10px]">
                                {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <Button 
                            className="w-full justify-start h-12 bg-primary hover:bg-primary/90 shadow-md group" 
                            onClick={() => router.push(`/restaurant-admin/dashboard?impersonate=${res.id}`)}
                          >
                            <ShieldAlert className="mr-3 h-5 w-5" /> 
                            <div className="text-left">
                              <p className="font-bold text-sm">Impersonate Admin</p>
                              <p className="text-[10px] opacity-80">Access dashboard as merchant</p>
                            </div>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
