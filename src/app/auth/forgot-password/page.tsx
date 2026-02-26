"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShoppingBag, Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { auth } = useFirebase();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Could not send reset email. Please check the address.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-xl p-2">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-primary">Reset Password</CardTitle>
          <CardDescription>
            {submitted 
              ? "We've sent a recovery link to your inbox." 
              : "Enter your email address and we'll send you a link to get back into your account."}
          </CardDescription>
        </CardHeader>
        
        {!submitted ? (
          <form onSubmit={handleReset}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@myrestonet.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full text-lg h-12" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-6 pt-4 text-center">
            <div className="flex justify-center">
              <div className="bg-accent/10 p-4 rounded-full">
                <MailCheck className="h-12 w-12 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <Button className="w-full h-12" asChild>
              <Link href="/auth/login">Return to Login</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
