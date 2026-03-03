
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Activity, 
  Search, 
  Download,
  CheckCircle2,
  Filter,
  Info
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function LogsPage() {
  const ALERTS: any[] = [];
  const AUDIT_LOGS: any[] = [];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" /> Platform Alerts & Logs
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Monitor system health and audit platform-wide activities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11" disabled>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="rounded-xl h-11" disabled>
            <Filter className="mr-2 h-4 w-4" /> Filter Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Alerts Section */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" /> Active Alerts
          </h2>
          <div className="space-y-4">
            {ALERTS.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed rounded-3xl p-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All systems operational</p>
              </div>
            )}
            {ALERTS.map((alert) => (
              <Card key={alert.id} className={`border-l-4 shadow-sm ${
                alert.severity === 'high' ? 'border-l-destructive' : 
                alert.severity === 'medium' ? 'border-l-orange-500' : 'border-l-accent'
              }`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{alert.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">{alert.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary text-white border-none shadow-lg rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent" /> System Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="opacity-80">Database Latency</span>
                <span className="font-mono">12ms</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="opacity-80">Storage Usage</span>
                <span className="font-mono">0.4 GB</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Auth Auth/s</span>
                <span className="font-mono">0</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="border-b bg-white flex flex-col md:flex-row items-center justify-between gap-4 py-8 px-10">
              <div>
                <CardTitle className="text-2xl font-black">Platform Audit Trail</CardTitle>
                <CardDescription className="font-medium text-slate-500">Comprehensive log of major actions performed.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-9 h-11 bg-slate-50 border-none rounded-xl shadow-sm" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {AUDIT_LOGS.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold text-[10px] uppercase tracking-[0.2em]">No audit entries recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[150px]">Date/Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AUDIT_LOGS.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-mono">{log.date}</TableCell>
                        <TableCell className="font-bold text-xs">{log.user}</TableCell>
                        <TableCell className="text-xs">{log.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic">{log.target}</TableCell>
                        <TableCell><Badge variant="secondary">{log.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
