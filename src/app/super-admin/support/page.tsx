
'use client';

import { SupportTicketingSystem } from '@/components/support-ticketing-system';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LifeBuoy } from 'lucide-react';

export default function GlobalSupportOversightPage() {
  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-primary" /> Platform Support Tickets
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Global oversight of all merchant requests.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Security Level</p>
            <p className="text-xs font-bold text-slate-900">Admin Oversight Active</p>
          </div>
        </div>
      </div>

      {/* Global mode: No restaurantId passed means SupportTicketingSystem will use collectionGroup */}
      <SupportTicketingSystem />
    </div>
  );
}
