import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AirdropLog {
  id: string;
  wallet: string;
  status: "success" | "error";
  digest?: string;
  error?: string;
  timestamp: number;
}

export default function AirdropLogPage() {
  const [logs, setLogs] = useState<AirdropLog[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      setLogs(data.logs);
    }
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Airdrop Logs</h1>
      <ScrollArea className="h-[80vh] border rounded-xl p-4">
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="bg-white">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{log.wallet}</span>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>
                    {log.status.toUpperCase()}
                  </Badge>
                </div>
                {log.digest && (
                  <div className="text-xs text-muted-foreground truncate">🔗 Tx: {log.digest}</div>
                )}
                {log.error && (
                  <div className="text-xs text-red-500">⚠️ Error: {log.error}</div>
                )}
                <div className="text-xs text-gray-500">
                  🕒 {new Date(log.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
