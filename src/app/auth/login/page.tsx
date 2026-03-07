"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShoppingBag, Loader2, AlertCircle, Chrome } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleUserRedirect(userCredential.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: error.message });
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerName: 'google' | 'apple') => {
    if (!auth || !firestore) return;
    setLoading(true);
    try {
      const provider = providerName === 'google' 
        ? new GoogleAuthProvider() 
        : new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      await handleUserRedirect(result.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Social Login failed", description: error.message });
      setLoading(false);
    }
  };

  const handleUserRedirect = async (user: User) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role?.toLowerCase();
        
        toast({ title: "Welcome back", description: `Signed in as ${role?.replace('_', ' ')}.` });

        if (role === 'super_admin') router.push('/super-admin/dashboard');
        else if (role === 'marketing_partner') router.push('/partner-admin/dashboard');
        else if (role === 'restaurant_admin' || role === 'staff') router.push('/restaurant-admin/dashboard');
        else router.push(`/customer/account`);
      } else {
        // --- Non-blocking Initial Account Creation ---
        const userProfileData = {
          id: user.uid,
          email: user.email,
          role: 'customer',
          createdAt: serverTimestamp(),
        };

        const profileData = {
          id: user.uid,
          firebaseAuthUid: user.uid,
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || 'User',
          lastName: user.displayName?.split(' ')[1] || '',
          loyaltyPoints: 0,
          walletBalance: 0,
          referralCode: Math.random().toString(36).substring(7).toUpperCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Fire and forget (handled by catch)
        setDoc(userDocRef, userProfileData).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfileData
          }));
        });

        const profileRef = doc(firestore, 'customerProfiles', user.uid);
        setDoc(profileRef, profileData, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: profileRef.path,
            operation: 'write',
            requestResourceData: profileData
          }));
        });

        router.push('/customer/account');
      }
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'get'
      }));
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
          <CardTitle className="text-3xl font-black text-primary tracking-tight">MyRestoNet</CardTitle>
          <CardDescription>Global Restaurant Ecosystem Access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={() => handleSocialLogin('google')} disabled={loading}>
              <Chrome className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={() => handleSocialLogin('apple')} disabled={loading}>
              <svg className="mr-2 h-4 w-4 fill-current" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              Apple
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with email</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" size="sm" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <Button className="w-full text-lg h-12 rounded-xl font-black shadow-xl" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            No account? <Link href="/auth/signup" className="text-primary font-bold hover:underline">Create one</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
