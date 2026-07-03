"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={cn("flex flex-1 flex-col overflow-hidden transition-all duration-150")}>
        {children}
      </main>
    </div>
  );
}
