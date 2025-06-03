import { useEffect } from "react";

export function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bg = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type];

  return (
    <div className={`fixed bottom-5 right-5 px-4 py-2 text-white rounded shadow-lg ${bg}`}>
      {message}
    </div>
  );
}
