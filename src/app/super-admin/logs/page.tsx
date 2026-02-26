"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  ShieldAlert, 
  Activity, 
  Search, 
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const ALERTS = [
  {
    id: 'alt-1',
    severity: 'high',
    title: 'High Database Latency',
    description: 'Database cluster DB-MAIN is experiencing response times > 500ms.',
    time: '2 mins ago',
  },
  {
    id: 'alt-2',
    severity: 'medium',
    title: 'Suspicious Login Attempt',
    description: 'Multiple failed login attempts detected for user admin@sakurazen.fr.',
    time: '15 mins ago',
  },
  {
    id: 'alt-3',
    severity: 'low',
    title: 'New Tenant Onboarded',
    description: 'Restaurant "Pasta Paradiso" has successfully completed setup.',
    time: '1 hour ago',
  }
];

const AUDIT_LOGS = [
  { id: 'log-1', user: 'Super Admin', action: 'Modified Subscription Tier', target: 'Pro Plan', status: 'Success', date: '2024-03-05 14:22:01' },
  { id: 'log-2', user: 'System', action: 'Automated Backup', target: 'Postgres Cluster', status: 'Success', date: '2024-03-05 03:00:15' },
  { id: 'log-3', user: 'Super Admin', action: 'Impersonated Tenant', target: 'Bella Napoli (rest-1)', status: 'Success', date: '2024-03-04 16:45:30' },
  { id: 'log-4', user: 'Admin (rest-2)', action: 'Deleted Menu Item', target: 'Sashimi Platter', status: 'Success', date: '2024-03-04 12:10:05' },
  { id: 'log-5', user: 'Super Admin', action: 'Suspended Tenant', target: 'Le Petit Bistro (rest-3)', status: 'Manual', date: '2024-03-04 09:15:22' },
];

export default function LogsPage() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <Activity className="h-8 w-8" /> Platform Alerts & Logs
          </h1>
          <p className="text-muted-foreground">Monitor system health and audit platform-wide activities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Filter className="mr-2 h-4 w-4" /> Filter Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Alerts Section */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-headline font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" /> Active Alerts
          </h2>
          <div className="space-y-4">
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
                  <div className="pt-2 flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2">Dismiss</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2">Investigate</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent" /> System Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="opacity-80">CPU Usage</span>
                <span className="font-mono">14%</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="opacity-80">Memory</span>
                <span className="font-mono">4.2 GB / 16 GB</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Network In/Out</span>
                <span className="font-mono">1.2 MB/s</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader className="border-b bg-white flex flex-col md:flex-row items-center justify-between gap-4 py-6">
              <div>
                <CardTitle className="font-headline">Platform Audit Trail</CardTitle>
                <CardDescription>Comprehensive log of every major action performed across MyRestoNet.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-9 shadow-sm" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-[10px] font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {log.date}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{log.user}</TableCell>
                      <TableCell className="text-xs">{log.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">{log.target}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'Success' ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0">
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 text-center">
              <Button variant="ghost" size="sm" className="text-xs text-primary font-bold">
                Load More History
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
