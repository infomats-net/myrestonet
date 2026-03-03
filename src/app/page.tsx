"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UtensilsCrossed, 
  MapPin, 
  Loader2,
  Globe,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function Home() {
  const firestore = useFirestore();

  // Fetch all active restaurants for the directory
  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'restaurants'), where('subscriptionStatus', '==', 'active'));
  }, [firestore]);

  const { data: restaurants, isLoading } = useCollection(restaurantsQuery);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link className="flex items-center justify-center gap-2" href="/">
            <div className="bg-primary rounded-xl p-2">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black font-headline tracking-tighter text-primary">MyRestoNet</span>
          </Link>
          <nav className="flex gap-4 sm:gap-6">
            <Button variant="ghost" asChild className="font-bold text-slate-600">
              <Link href="/auth/login">Merchant Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-32 bg-primary text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl font-headline leading-tight">
                  Taste the World <br/>
                  <span className="text-accent italic">One Order at a Time.</span>
                </h1>
                <p className="mx-auto max-w-[800px] text-primary-foreground/80 md:text-2xl font-medium leading-relaxed">
                  Discover top-rated local restaurants powered by the MyRestoNet global network. Seamless ordering, instant reservations.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 bg-slate-50/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Our Restaurant Partners</h2>
                <p className="text-slate-500 font-medium mt-2">Explore elite culinary experiences in your neighborhood.</p>
              </div>
              <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-2 px-4">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Global Network Active</span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading local flavors...</p>
              </div>
            ) : restaurants && restaurants.length > 0 ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {restaurants.map((res) => (
                  <Card key={res.id} className="group border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white hover:scale-[1.03] transition-all duration-500">
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <img 
                        src={res.bannerUrl || `https://picsum.photos/seed/${res.id}/600/400`} 
                        alt={res.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-6 left-6 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg">
                          <img 
                            src={res.logoUrl || `https://picsum.photos/seed/logo-${res.id}/100/100`} 
                            className="w-full h-full object-contain"
                            alt="Logo"
                          />
                        </div>
                        <div className="text-white">
                          <h3 className="font-black text-lg leading-none">{res.name}</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">{res.cuisine?.[0] || 'International'}</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{res.city}, {res.country}</span>
                        </div>
                        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          Experience the finest {res.cuisine?.join(', ').toLowerCase()} dishes crafted by master chefs.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button className="w-full rounded-2xl h-12 font-black shadow-lg shadow-primary/10" asChild>
                          <Link href={`/customer/${res.id}`} target="_blank">
                            Order Online <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" className="w-full rounded-2xl h-12 font-bold text-slate-500" asChild>
                          <Link href={`/customer/${res.id}/reserve`} target="_blank">
                            Book a Table
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <UtensilsCrossed className="h-16 w-16 mx-auto text-slate-200 mb-6" />
                <h3 className="text-2xl font-black text-slate-900">No Restaurants Found</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium">
                  We're currently expanding our network. Check back soon for new local favorites!
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-white">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="font-black text-lg tracking-tight">MyRestoNet</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">© 2024 MyRestoNet Global Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Merchant Portal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
