"use client"

import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  Globe, 
  Sparkles,
  Settings,
  LogOut,
  ShoppingBag,
  ExternalLink,
  Loader2,
  Palette,
  Camera,
  LayoutGrid,
  CalendarDays,
  CreditCard,
  Banknote,
  Package
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { Suspense } from "react"

function SidebarBrand() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !authUser?.uid) return null;
    return doc(db, 'users', authUser.uid);
  }, [db, authUser?.uid]);

  const { data: userProfile } = useDoc(userProfileRef);
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  const restaurantRef = useMemoFirebase(() => {
    if (!db || !effectiveRestaurantId) return null;
    return doc(db, 'restaurants', effectiveRestaurantId);
  }, [db, effectiveRestaurantId]);
  const { data: restaurant } = useDoc(restaurantRef);

  const designRef = useMemoFirebase(() => {
    if (!db || !effectiveRestaurantId) return null;
    return doc(db, 'restaurants', effectiveRestaurantId, 'design', 'settings');
  }, [db, effectiveRestaurantId]);
  const { data: designSettings } = useDoc(designRef);

  return (
    <Link href="/" className="flex items-center gap-3 w-full">
      {designSettings?.branding?.logoUrl ? (
        <img 
          src={designSettings.branding.logoUrl} 
          className="h-10 w-10 rounded-lg object-contain shrink-0" 
          alt="Logo" 
        />
      ) : (
        <div className="bg-accent rounded-lg p-2 shrink-0">
          <ShoppingBag className="h-6 w-6 text-white" />
        </div>
      )}
      <span className="font-black text-xl text-primary truncate group-data-[collapsible=icon]:hidden tracking-tighter">
        {restaurant?.name || 'Merchant Panel'}
      </span>
    </Link>
  );
}

function SidebarLinks() {
  const auth = useAuth();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !authUser?.uid) return null;
    return doc(db, 'users', authUser.uid);
  }, [db, authUser?.uid]);

  const { data: userProfile } = useDoc(userProfileRef);
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getHref = (tab: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (impersonateId) params.set('impersonate', impersonateId);
    return `/restaurant-admin/dashboard?${params.toString()}`;
  };

  const isTabActive = (tab: string) => {
    const currentTab = searchParams.get('tab') || 'overview';
    return currentTab === tab;
  };

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" isActive={isTabActive('overview')}>
                  <Link href={getHref('overview')}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Orders" isActive={isTabActive('orders')}>
                  <Link href={getHref('orders')}>
                    <ShoppingCart />
                    <span>Orders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Inventory" isActive={isTabActive('inventory')}>
                  <Link href={getHref('inventory')}>
                    <Package />
                    <span>Inventory</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Reservations" isActive={isTabActive('reservations')}>
                  <Link href={getHref('reservations')}>
                    <CalendarDays className="h-4 w-4" />
                    <span>Reservations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Catalog & Media</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Menu Catalog" isActive={isTabActive('menu')}>
                  <Link href={getHref('menu')}>
                    <Utensils />
                    <span>Menu Catalog</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Photo Gallery" isActive={isTabActive('gallery')}>
                  <Link href={getHref('gallery')}>
                    <Camera />
                    <span>Photo Gallery</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Business & Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Payments (Stripe)" isActive={isTabActive('payments')}>
                  <Link href={getHref('payments')}>
                    <Banknote className="text-emerald-600" />
                    <span>Payouts & Stripe</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Billing" isActive={isTabActive('billing')}>
                  <Link href={getHref('billing')}>
                    <CreditCard className="text-primary" />
                    <span>Platform Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Design" isActive={isTabActive('design')}>
                  <Link href={getHref('design')}>
                    <Palette className="text-accent" />
                    <span>Store Designer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Public Presence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Website" className="text-primary hover:bg-primary/5">
                  <Link href={effectiveRestaurantId ? `/customer/${effectiveRestaurantId}` : "#"} target="_blank">
                    <ExternalLink />
                    <span>Live Storefront</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={isTabActive('settings')}>
              <Link href={getHref('settings')}>
                <Settings />
                <span>Store Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Sign Out" 
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function RestaurantSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-20 flex items-center justify-center border-b px-4">
        <Suspense fallback={<div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />}>
          <SidebarBrand />
        </Suspense>
      </SidebarHeader>
      <Suspense fallback={<div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}>
        <SidebarLinks />
      </Suspense>
    </Sidebar>
  )
}
