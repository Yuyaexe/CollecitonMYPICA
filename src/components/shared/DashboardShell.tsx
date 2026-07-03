"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <div className="hidden md:flex md:h-full">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        )}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
