
"use client";

import { useState } from 'react';
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
  Users,
  Loader2,
  Save
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const INITIAL_TIERS = [
  {
    name: 'Basic',
    price: '$49',
    period: '/mo',
    features: ['Up to 500 orders', 'Standard SEO', 'Email Support', 'Basic Analytics'],
    activeTenants: 45,
    color: 'bg-muted text-muted-foreground',
    popular: false
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
    color: 'bg-accent/10 text-accent border-accent/20',
    popular: false
  }
];

const RECENT_INVOICES = [
  { id: 'INV-001', tenant: 'Bella Napoli', amount: '$149.00', status: 'Paid', date: '2024-03-01' },
  { id: 'INV-002', tenant: 'Sakura Zen', amount: '$599.00', status: 'Paid', date: '2024-03-01' },
  { id: 'INV-003', tenant: 'Le Petit Bistro', amount: '$49.00', status: 'Overdue', date: '2024-02-15' },
];

export default function BillingPage() {
  const [tiers, setTiers] = useState(INITIAL_TIERS);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleEditClick = (tier: any) => {
    setEditingTier({ ...tier });
    setIsEditDialogOpen(true);
  };

  const handleSaveTier = () => {
    if (!editingTier) return;
    setIsSaving(true);
    
    // Simulate API delay
    setTimeout(() => {
      setTiers(prev => prev.map(t => t.name === editingTier.name ? editingTier : t));
      setIsSaving(false);
      setIsEditDialogOpen(false);
      toast({
        title: "Tier updated",
        description: `Changes to the ${editingTier.name} plan have been saved successfully.`,
      });
    }, 600);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Tiers</h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Manage platform subscriptions and monitor revenue streams.</p>
        </div>
        <Button className="rounded-xl h-11 shadow-xl shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Create New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">$24,560.00</div>
            <p className="text-xs text-emerald-600 font-bold flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">142</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Across all tiers</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive">3</div>
            <p className="text-xs text-destructive font-bold mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`relative flex flex-col border-none shadow-xl rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.02] ${tier.popular ? 'ring-2 ring-primary' : ''}`}>
            {tier.popular && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-none rounded-bl-2xl bg-primary text-white px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">
                  Popular
                </Badge>
              </div>
            )}
            <CardHeader className="pt-10 px-8">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">{tier.name}</CardTitle>
                  <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Plan Details</CardDescription>
                </div>
                <Badge className={`rounded-lg ${tier.color}`}>{tier.activeTenants} Tenants</Badge>
              </div>
              <div className="mt-6">
                <span className="text-5xl font-black tracking-tight text-slate-900">{tier.price}</span>
                <span className="text-muted-foreground ml-1 font-bold">{tier.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 px-8 py-6">
              <ul className="space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <div className="bg-primary/10 rounded-full p-1">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-8 pt-0 mt-auto">
              <Button 
                variant={tier.popular ? "default" : "outline"} 
                className="w-full h-14 rounded-2xl font-black shadow-lg"
                onClick={() => handleEditClick(tier)}
              >
                Edit Tier <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-white border-b py-8 px-10">
          <CardTitle className="text-2xl font-black">Recent Billing Transactions</CardTitle>
          <CardDescription className="font-medium text-slate-500">A log of the most recent payments across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Invoice ID</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Tenant</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Amount</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Date</TableHead>
                <TableHead className="text-right px-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_INVOICES.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="px-10 font-bold text-slate-900">{invoice.id}</TableCell>
                  <TableCell className="font-medium text-slate-600">{invoice.tenant}</TableCell>
                  <TableCell className="font-black text-slate-900">{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-md">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{invoice.date}</TableCell>
                  <TableCell className="text-right px-10">
                    <Button variant="ghost" size="sm" className="h-8 px-4 text-primary font-bold hover:bg-primary/5 rounded-lg">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Subscription Tier</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Update the pricing and properties for the {editingTier?.name} plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-bold text-slate-700">Tier Name</Label>
              <Input
                id="name"
                value={editingTier?.name || ''}
                onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-slate-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price" className="font-bold text-slate-700">Price Display</Label>
              <Input
                id="price"
                value={editingTier?.price || ''}
                onChange={(e) => setEditingTier({ ...editingTier, price: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-slate-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenants" className="font-bold text-slate-700">Active Tenants</Label>
              <Input
                id="tenants"
                type="number"
                value={editingTier?.activeTenants || 0}
                onChange={(e) => setEditingTier({ ...editingTier, activeTenants: parseInt(e.target.value) || 0 })}
                className="h-12 rounded-xl bg-slate-50 border-slate-100"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="popular" 
                checked={editingTier?.popular || false} 
                onChange={(e) => setEditingTier({ ...editingTier, popular: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="popular" className="font-bold text-slate-700 cursor-pointer">Mark as Most Popular</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" 
              onClick={handleSaveTier}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
