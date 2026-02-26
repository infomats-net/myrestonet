import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LayoutDashboard, Store, Users, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary rounded-lg p-1">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold font-headline tracking-tight text-primary">MyRestoNet</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/auth/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/auth/signup">
            Super Admin Signup
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary text-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                  Global Restaurant Management, <span className="text-accent">Simplified.</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-primary-foreground/90 md:text-xl font-body">
                  Empower your culinary empire with real-time insights, multi-tenant security, and AI-driven growth tools.
                </p>
              </div>
              <div className="space-x-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/signup">Get Started as Super Admin</Link>
                </Button>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                  <Link href="/customer/rest-1">View Demo Menu <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Persona Entry Points */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 lg:grid-cols-3">
              <Card className="flex flex-col h-full border-none shadow-lg">
                <CardHeader>
                  <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-2xl">Super Admin</CardTitle>
                  <CardDescription>
                    Manage the entire MyRestoNet platform. Subscriptions, global configs, and restaurant onboarding.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Button className="w-full mt-auto" asChild>
                    <Link href="/super-admin/dashboard">Go to Portal</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex flex-col h-full border-none shadow-lg">
                <CardHeader>
                  <div className="mb-4 p-3 bg-accent/10 w-fit rounded-xl">
                    <LayoutDashboard className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-headline text-2xl">Restaurant Admin</CardTitle>
                  <CardDescription>
                    Control your kitchen and dining room. Manage menus, orders, local SEO, and AI analytics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Button variant="outline" className="w-full mt-auto" asChild>
                    <Link href="/restaurant-admin/dashboard">Access Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex flex-col h-full border-none shadow-lg">
                <CardHeader>
                  <div className="mb-4 p-3 bg-secondary w-fit rounded-xl">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-2xl">End Customer</CardTitle>
                  <CardDescription>
                    The ultra-fast ordering experience. Browse localized menus and place orders seamlessly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Button variant="ghost" className="w-full mt-auto" asChild>
                    <Link href="/customer/rest-1">Try Ordering App</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 bg-white">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2024 MyRestoNet Global Inc. All rights reserved.</p>
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-sm text-muted-foreground hover:underline" href="#">Terms of Service</Link>
            <Link className="text-sm text-muted-foreground hover:underline" href="#">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
