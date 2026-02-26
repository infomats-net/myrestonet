"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Suspense } from 'react';

function BannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const impersonateId = searchParams.get('impersonate');

  if (!impersonateId) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between sticky top-0 z-[60] shadow-md animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 animate-pulse" />
        <p className="text-sm font-bold">
          Impersonation Mode Active <span className="hidden sm:inline">| Tenant ID: {impersonateId}</span>
        </p>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        className="h-7 text-xs font-bold"
        onClick={() => router.push('/super-admin/tenants')}
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Exit & Return to Super Admin
      </Button>
    </div>
  );
}

export function ImpersonationBanner() {
  return (
    <Suspense fallback={null}>
      <BannerContent />
    </Suspense>
  );
}
