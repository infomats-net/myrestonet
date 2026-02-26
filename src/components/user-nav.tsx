"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Settings, 
  Key, 
  LogOut,
  Bell
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function UserNav() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" className="relative text-muted-foreground">
        <Bell className="h-5 w-5" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              <AvatarImage src="https://picsum.photos/seed/user1/100/100" alt="User" />
              <AvatarFallback className="bg-primary/5 text-primary">AD</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 shadow-2xl border-none p-2" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-bold leading-none">Admin User</p>
              <p className="text-xs leading-none text-muted-foreground">admin@myrestonet.com</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuGroup className="space-y-1">
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
              <Link href="#">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
              <Link href="#">
                <Key className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
              <Link href="#">
                <Settings className="mr-2 h-4 w-4" />
                <span>Preferences</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive">
            <Link href="/auth/login">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
