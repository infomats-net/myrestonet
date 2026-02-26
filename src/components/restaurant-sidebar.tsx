
"use client"

import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  Globe, 
  Sparkles,
  Settings,
  LogOut,
  ShoppingBag
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
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"

export function RestaurantSidebar() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Overview" isActive={pathname === "/restaurant-admin/dashboard"}>
                  <Link href="/restaurant-admin/dashboard?tab=overview">
                    <LayoutDashboard />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Orders">
                  <Link href="/restaurant-admin/dashboard?tab=orders">
                    <ShoppingCart />
                    <span>Orders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Menu">
                  <Link href="/restaurant-admin/dashboard?tab=menu">
                    <Utensils />
                    <span>Menu Catalog</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Growth Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="AI Insights">
                  <Link href="/restaurant-admin/dashboard?tab=analytics">
                    <Sparkles className="text-accent" />
                    <span>AI Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="SEO">
                  <Link href="/restaurant-admin/dashboard?tab=seo">
                    <Globe />
                    <span>Localized SEO</span>
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
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/restaurant-admin/dashboard?tab=overview">
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
    </Sidebar>
  )
}
