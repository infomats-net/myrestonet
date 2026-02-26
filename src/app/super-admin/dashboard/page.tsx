
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Store, 
  CreditCard, 
  TrendingUp, 
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Global Overview</h1>
          <p className="text-muted-foreground">Platform-wide performance and system health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$124,563.00</div>
            <p className="text-xs text-accent font-semibold">+12.5% from last month</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Restaurants</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-accent font-semibold">+4 new this week</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,234</div>
            <p className="text-xs text-muted-foreground">Active platform-wide</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-between" asChild variant="outline">
              <Link href="/super-admin/tenants">
                Manage Restaurant Tenants <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="outline">
              Review Subscription Tiers <ArrowRight className="h-4 w-4" />
            </Button>
            <Button className="w-full justify-between" variant="outline">
              View Platform Audit Logs <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-primary text-white">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Platform Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/20 pb-2">
              <span>API Gateway</span>
              <Badge className="bg-accent text-accent-foreground">Operational</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-2">
              <span>Database Cluster</span>
              <Badge className="bg-accent text-accent-foreground">Operational</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-2">
              <span>Image Processing</span>
              <Badge className="bg-accent text-accent-foreground">Operational</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
