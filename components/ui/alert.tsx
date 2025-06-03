import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4 text-yellow-800",
        className
      )}
    >
      {children}
    </div>
  );
}