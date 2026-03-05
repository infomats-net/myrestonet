
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LifeBuoy, Info } from 'lucide-react';

export default function GlobalSupportOversightPage() {
  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-primary" /> Platform Support Center
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Platform-wide support overview.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Security Level</p>
            <p className="text-xs font-bold text-slate-900">Admin Oversight Active</p>
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
        <CardContent className="p-20 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Info className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Support Center Closed</h3>
            <p className="text-slate-400 max-w-sm mx-auto mt-2">The ticketing system has been decommissioned. Please use global administration logs for oversight.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
