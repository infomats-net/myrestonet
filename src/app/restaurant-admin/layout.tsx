import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { RestaurantSidebar } from "@/components/restaurant-sidebar"
import { UserNav } from "@/components/user-nav"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { RestaurantHeaderInfo } from "@/components/restaurant-header-info"

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
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border mx-1" />
            <RestaurantHeaderInfo />
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
