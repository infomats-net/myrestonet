"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Check, 
  Plus, 
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TIERS = [
  {
    name: 'Basic',
    price: '$49',
    period: '/mo',
    features: ['Up to 500 orders', 'Standard SEO', 'Email Support', 'Basic Analytics'],
    activeTenants: 45,
    color: 'bg-muted text-muted-foreground'
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/mo',
    features: ['Unlimited orders', 'Advanced AI Insights', 'Custom Domains', 'Priority Support', 'Full SEO Suite'],
    activeTenants: 82,
    color: 'bg-primary/10 text-primary border-primary/20',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Multi-region support', 'Dedicated Account Manager', 'SLA Guarantees', 'Custom AI Models', 'Whitelabeling'],
    activeTenants: 15,
    color: 'bg-accent/10 text-accent border-accent/20'
  }
];

const RECENT_INVOICES = [
  { id: 'INV-001', tenant: 'Bella Napoli', amount: '$149.00', status: 'Paid', date: '2024-03-01' },
  { id: 'INV-002', tenant: 'Sakura Zen', amount: '$599.00', status: 'Paid', date: '2024-03-01' },
  { id: 'INV-003', tenant: 'Le Petit Bistro', amount: '$49.00', status: 'Overdue', date: '2024-02-15' },
];

export default function BillingPage() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Billing & Tiers</h1>
          <p className="text-muted-foreground">Manage platform subscriptions and monitor revenue streams.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Create New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,560.00</div>
            <p className="text-xs text-accent font-semibold flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">Across all tiers</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-destructive font-semibold">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {TIERS.map((tier) => (
          <Card key={tier.name} className={`relative flex flex-col border-none shadow-lg ${tier.popular ? 'ring-2 ring-primary' : ''}`}>
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-headline font-bold">{tier.name}</CardTitle>
                  <CardDescription>Plan Details</CardDescription>
                </div>
                <Badge className={tier.color}>{tier.activeTenants} Tenants</Badge>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground ml-1">{tier.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="bg-accent/20 rounded-full p-0.5">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Button variant={tier.popular ? "default" : "outline"} className="w-full">
                Edit Tier <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Recent Billing Transactions</CardTitle>
          <CardDescription>A log of the most recent payments across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_INVOICES.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.tenant}</TableCell>
                  <TableCell>{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold px-2 py-0">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
