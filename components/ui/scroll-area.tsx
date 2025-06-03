import * as React from "react";

export function ScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-y-auto max-h-[500px] pr-2">
      {children}
    </div>
  );
}
