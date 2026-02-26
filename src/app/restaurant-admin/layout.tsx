import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { RestaurantSidebar } from "@/components/restaurant-sidebar"

export default function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <RestaurantSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white/50 backdrop-blur-md sticky top-0 z-20">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border mx-2" />
          <p className="text-sm font-medium text-muted-foreground">Merchant Dashboard</p>
        </header>
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}