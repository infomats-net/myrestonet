import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { RestaurantSidebar } from "@/components/restaurant-sidebar"
import { UserNav } from "@/components/user-nav"
import { ImpersonationBanner } from "@/components/impersonation-banner"

export default function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <RestaurantSidebar />
      <SidebarInset>
        <ImpersonationBanner />
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border mx-2" />
            <p className="text-sm font-medium text-muted-foreground">Merchant Dashboard</p>
          </div>
          <UserNav />
        </header>
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
