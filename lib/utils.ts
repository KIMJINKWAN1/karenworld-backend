import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge"; // ✅ 수정

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}