
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Store, 
  CreditCard, 
  TrendingUp, 
  ArrowRight,
  ArrowUpRight,
  Activity,
  Globe, 
  ShieldCheck,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

const REVENUE_DATA = [
  { month: 'Jan', revenue: 45000, users: 1200 },
  { month: 'Feb', revenue: 52000, users: 1500 },
  { month: 'Mar', revenue: 48000, users: 1800 },
  { month: 'Apr', revenue: 61000, users: 2200 },
  { month: 'May', revenue: 75000, users: 2800 },
  { month: 'Jun', revenue: 82000, users: 3500 },
  { month: 'Jul', revenue: 95000, users: 4200 },
];

const TENANT_DISTRIBUTION = [
  { name: 'Active', value: 85, color: 'hsl(var(--primary))' },
  { name: 'Trial', value: 42, color: 'hsl(var(--accent))' },
  { name: 'Suspended', value: 15, color: 'hsl(var(--destructive))' },
];

const TOP_RESTAURANTS = [
  { name: 'Bella Napoli', revenue: '$12,450', growth: '+12%', color: 'bg-emerald-500' },
  { name: 'Sakura Zen', revenue: '$9,800', growth: '+8%', color: 'bg-blue-500' },
  { name: 'Le Petit Bistro', revenue: '$7,200', growth: '+5%', color: 'bg-amber-500' },
  { name: 'Pasta Paradiso', revenue: '$6,500', growth: '+15%', color: 'bg-purple-500' },
];

export default function SuperAdminDashboard() {
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
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">ARR (Estimated)</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">$1.24M</div>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12.5% vs LW
            </p>
          </CardContent>
        </Card>
        
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Tenants</CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg"><Store className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">142</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">4 pending onboarding</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Global Users</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">8,234</div>
            <p className="text-xs text-blue-600 font-bold mt-1">Active past 24h</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-lg bg-primary text-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-70">Uptime Status</CardTitle>
            <ShieldCheck className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">99.98%</div>
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
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-slate-100 rounded-lg">Last 7 Months</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b bg-white">
            <CardTitle className="text-xl font-black">Tenant Distribution</CardTitle>
            <CardDescription>Breakdown by subscription status.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TENANT_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {TENANT_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">142</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
            </div>
            <div className="w-full space-y-3 mt-6">
              {TENANT_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b bg-white">
            <CardTitle className="text-xl font-black">Top Performing Tenants</CardTitle>
            <CardDescription>Restaurants with highest transaction volume.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {TOP_RESTAURANTS.map((res, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg", res.color)}>
                      {res.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{res.name}</p>
                      <p className="text-xs text-muted-foreground">Premium Plan</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                      <p className="font-black text-slate-900">{res.revenue}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{res.growth} MTD</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
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
                <Globe className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
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
