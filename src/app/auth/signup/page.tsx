"use client";

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-100 rounded-xl p-2">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tight text-center">Registration Closed</CardTitle>
          <CardDescription className="text-center">Public registration for MyRestoNet is currently unavailable.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-slate-500">
            If you are a restaurant owner or partner looking to join our network, please contact our administrative team directly for onboarding.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" asChild className="w-full rounded-xl">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Homepage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
