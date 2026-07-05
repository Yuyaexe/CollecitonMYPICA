"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CollectionFilters } from "@/features/collection/components/CollectionFilters";

export function MobileFilters() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex h-full w-[min(100vw-1rem,20rem)] max-w-[85vw] flex-col p-0">
        <SheetHeader className="shrink-0 p-4 pb-0">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <CollectionFilters inSheet />
        </div>
      </SheetContent>
    </Sheet>
  );
}
