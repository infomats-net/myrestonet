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
  Mail,
  MapPin,
  Info,
  ChevronRight,
  Loader2,
  Phone,
  Calendar,
  Layers,
  Coins,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function TenantsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [search, setSearch] = useState('');

  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'restaurants'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: restaurants, isLoading } = useCollection(restaurantsQuery);

  const filteredRestaurants = restaurants?.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
    r.id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString();
      }
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" /> Restaurant Tenants
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Manage multi-tenant isolation and global parameters.</p>
        </div>
        <Button asChild className="rounded-xl h-11 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
          <Link href="/super-admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" /> Create Restaurant
          </Link>
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-white border-b flex flex-col md:flex-row items-center justify-between gap-4 py-8 px-10">
          <div>
            <CardTitle className="text-2xl font-black">Active Subscriptions</CardTitle>
            <CardDescription className="font-medium text-slate-500">Managing {filteredRestaurants.length} tenant instances.</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filter by name, ID or email..." 
              className="pl-12 h-12 bg-slate-50 border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Loading Platform Tenants...</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredRestaurants.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">
                  <Info className="h-16 w-16 mx-auto mb-4 opacity-10" />
                  <p className="font-medium">No restaurants found matching your search.</p>
                </div>
              ) : (
                filteredRestaurants.map((res) => (
                  <AccordionItem key={res.id} value={res.id} className="border-b last:border-b-0">
                    <AccordionTrigger className="hover:no-underline px-10 py-6 transition-all hover:bg-slate-50/50">
                      <div className="flex flex-1 items-center justify-between text-left pr-6">
                        <div className="flex items-center gap-6">
                          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shrink-0">
                            <span className="text-xl font-black">{res.name?.[0] || 'R'}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-black text-xl text-slate-900 leading-tight">{res.name}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-primary" /> {res.city}, {res.country}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-primary" /> {res.adminEmail}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="hidden lg:flex items-center gap-6">
                           <div className="text-right">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Domain</p>
                             <p className="font-bold text-slate-900">{res.customDomain || 'System Default'}</p>
                           </div>
                           <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-4 py-1 rounded-lg font-bold">
                             Active
                           </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-10 pb-10 pt-4 bg-slate-50/30">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Info className="h-3 w-3" /> Restaurant Profile
                          </h4>
                          <div className="space-y-4 bg-white p-6 rounded-[1.5rem] border shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Admin / Contact Email</span>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-primary/60" />
                                <span className="text-sm font-bold text-slate-700 truncate">{res.adminEmail}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contact Phone</span>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-primary/60" />
                                <span className="text-sm font-bold text-slate-700">{res.contactPhone || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Cuisines</span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {res.cuisine?.map((c: string) => (
                                  <Badge key={c} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold uppercase tracking-wider">
                                    {c}
                                  </Badge>
                                )) || <span className="text-xs text-slate-400 italic">None listed</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Location Params
                          </h4>
                          <div className="space-y-4 bg-white p-6 rounded-[1.5rem] border shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Physical Address</span>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{res.address}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">City</span>
                                <span className="text-sm font-bold text-slate-700">{res.city}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Postal Code</span>
                                <span className="text-sm font-bold text-slate-700">{res.postcode}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Layers className="h-3 w-3" /> Instance Config
                          </h4>
                          <div className="space-y-4 bg-white p-6 rounded-[1.5rem] border shadow-sm mb-6">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2 text-slate-400">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Custom Domain</span>
                              </div>
                              <span className="font-bold text-slate-700 text-xs">{res.customDomain || 'None'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2 text-slate-400">
                                <Coins className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Currency</span>
                              </div>
                              <span className="font-bold text-slate-700 text-xs">{res.baseCurrency}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2 text-slate-400">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Initialized</span>
                              </div>
                              <span className="font-bold text-slate-700 text-[10px]">
                                {formatDate(res.createdAt)}
                              </span>
                            </div>
                          </div>

                          <Button 
                            className="w-full justify-start h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl group" 
                            onClick={() => router.push(`/restaurant-admin/dashboard?impersonate=${res.id}`)}
                          >
                            <ShieldAlert className="mr-3 h-5 w-5 text-primary animate-pulse" /> 
                            <div className="text-left">
                              <p className="font-black text-sm uppercase tracking-wide">Impersonate Admin</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Access isolated merchant instance</p>
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
