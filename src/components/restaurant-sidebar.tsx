
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
  Camera
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

function SidebarLinks() {
  const auth = useAuth();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !authUser?.uid || impersonateId) return null;
    return doc(db, 'users', authUser.uid);
  }, [db, authUser?.uid, impersonateId]);

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
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Overview" isActive={isTabActive('overview')}>
                  <Link href={getHref('overview')}>
                    <LayoutDashboard />
                    <span>Overview</span>
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
                <SidebarMenuButton asChild tooltip="Menu" isActive={isTabActive('menu')}>
                  <Link href={getHref('menu')}>
                    <Utensils />
                    <span>Menu Catalog</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Brand & Customization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Design" isActive={isTabActive('design')}>
                  <Link href={getHref('design')}>
                    <Palette className="text-accent" />
                    <span>Design Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Gallery" isActive={isTabActive('gallery')}>
                  <Link href={getHref('gallery')}>
                    <Camera className="text-accent" />
                    <span>Photo Gallery</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="SEO" isActive={isTabActive('seo')}>
                  <Link href={getHref('seo')}>
                    <Globe />
                    <span>Localized SEO</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="AI Insights" isActive={isTabActive('analytics')}>
                  <Link href={getHref('analytics')}>
                    <Sparkles className="text-accent" />
                    <span>AI Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Storefront</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Website" className="text-primary hover:bg-primary/5">
                  <Link href={effectiveRestaurantId ? `/customer/${effectiveRestaurantId}` : "#"} target="_blank">
                    <ExternalLink />
                    <span>Show My Website</span>
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
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-accent rounded-lg p-1.5 shrink-0">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-primary truncate group-data-[collapsible=icon]:hidden">
            Merchant Panel
          </span>
        </Link>
      </SidebarHeader>
      <Suspense fallback={<div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}>
        <SidebarLinks />
      </Suspense>
    </Sidebar>
  )
}
