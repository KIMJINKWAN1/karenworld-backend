import * as React from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {children}
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
