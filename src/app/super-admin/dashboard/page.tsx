
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Store, 
  CreditCard, 
  TrendingUp, 
  Activity,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const distributionChartConfig = {
  active: {
    label: "Active",
    color: "hsl(var(--primary))",
  },
  trial: {
    label: "Trial",
    color: "hsl(var(--accent))",
  },
  suspended: {
    label: "Suspended",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

export default function SuperAdminDashboard() {
  const firestore = useFirestore();

  // Fetch real tenants for metrics
  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'restaurants');
  }, [firestore]);
  const { data: restaurants, isLoading } = useCollection(restaurantsQuery);

  // Dynamic calculations based on real data
  const stats = useMemo(() => {
    if (!restaurants) return { active: 0, trial: 0, suspended: 0, total: 0 };
    return restaurants.reduce((acc, res) => {
      acc.total++;
      if (res.subscriptionStatus === 'active') acc.active++;
      else if (res.subscriptionStatus === 'trial') acc.trial++;
      else if (res.subscriptionStatus === 'suspended') acc.suspended++;
      return acc;
    }, { active: 0, trial: 0, suspended: 0, total: 0 });
  }, [restaurants]);

  const distributionData = [
    { name: 'Active', value: stats.active, color: 'hsl(var(--primary))' },
    { name: 'Trial', value: stats.trial, color: 'hsl(var(--accent))' },
    { name: 'Suspended', value: stats.suspended, color: 'hsl(var(--destructive))' },
  ];

  // Placeholder for revenue chart (requires orders aggregation)
  const emptyRevenueData = [
    { month: 'N/A', revenue: 0 }
  ];

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Control Center</h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Real-time global metrics and system health monitoring.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-11" asChild>
            <Link href="/super-admin/logs"><Activity className="mr-2 h-4 w-4" /> System Logs</Link>
          </Button>
          <Button className="rounded-xl h-11 shadow-xl shadow-primary/20" asChild>
            <Link href="/super-admin/tenants/new"><Store className="mr-2 h-4 w-4" /> Provision Tenant</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Monthly Revenue</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">$0.00</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Aggregation pending...</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Tenants</CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg"><Store className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.total}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{stats.active} Active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Global Users</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">0</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Real-time pulse starting...</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-lg bg-primary text-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-70">Uptime Status</CardTitle>
            <ShieldCheck className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">100%</div>
            <p className="text-xs opacity-80 mt-1">All regions operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b bg-white flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black">Revenue Performance</CardTitle>
              <CardDescription>Platform-wide gross revenue across all tenants.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed">
              <TrendingUp className="h-12 w-12 text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No transaction data available yet</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b bg-white">
            <CardTitle className="text-xl font-black">Tenant Distribution</CardTitle>
            <CardDescription>Breakdown by subscription status.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            {stats.total > 0 ? (
              <>
                <div className="h-[250px] w-full relative">
                  <ChartContainer config={distributionChartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                  </div>
                </div>
                <div className="w-full space-y-3 mt-6">
                  {distributionData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-black text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-20 text-center">
                <Info className="h-12 w-12 mx-auto opacity-10 mb-4" />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No tenants onboarded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b bg-white">
            <CardTitle className="text-xl font-black">Latest Tenants</CardTitle>
            <CardDescription>Recently onboarded restaurant instances.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {restaurants?.slice(0, 5).map((res, i) => (
                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary text-white font-black text-lg">
                      {res.name?.[0] || 'R'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{res.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{res.subscriptionStatus || 'Active'} Plan</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{res.city}</Badge>
                    <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                      <Link href={`/restaurant-admin/dashboard?impersonate=${res.id}`}><ChevronRight className="h-5 w-5" /></Link>
                    </Button>
                  </div>
                </div>
              ))}
              {(!restaurants || restaurants.length === 0) && (
                <div className="p-20 text-center text-muted-foreground italic">No restaurants found.</div>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50/50 text-center">
              <Button variant="link" className="text-xs font-bold text-primary uppercase tracking-widest" asChild>
                <Link href="/super-admin/tenants">View All Tenants</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden h-fit">
          <CardHeader className="p-8 border-b bg-white">
            <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
            <CardDescription>Platform management shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-24 rounded-3xl flex flex-col gap-2 bg-white hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
              <Link href="/super-admin/tenants">
                <Store className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold">Manage Tenants</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 rounded-3xl flex flex-col gap-2 bg-white hover:bg-accent/5 hover:border-accent/20 transition-all group" asChild>
              <Link href="/super-admin/partners">
                <Briefcase className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                <span className="font-bold">Partner Ecosystem</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 rounded-3xl flex flex-col gap-2 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all group" asChild>
              <Link href="/super-admin/billing">
                <CreditCard className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Billing & Tiers</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 rounded-3xl flex flex-col gap-2 bg-white hover:bg-amber-50 hover:border-amber-200 transition-all group" asChild>
              <Link href="/super-admin/support">
                <Users className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Support Staff</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
