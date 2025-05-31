import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, RefreshCw } from "lucide-react";

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
  const [filtered, setFiltered] = useState<AirdropLog[]>([]);
  const [query, setQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(true);
  const [showError, setShowError] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, query, showSuccess, showError]);

  async function fetchLogs() {
    const res = await fetch("/api/admin/logs");
    const data = await res.json();
    setLogs(data.logs);
  }

  function filterLogs() {
    const q = query.toLowerCase();
    const result = logs.filter((log) => {
      const matchQuery =
        log.wallet.toLowerCase().includes(q) ||
        log.digest?.toLowerCase().includes(q) ||
        log.error?.toLowerCase().includes(q);
      const matchStatus =
        (showSuccess && log.status === "success") ||
        (showError && log.status === "error");
      return matchQuery && matchStatus;
    });
    setFiltered(result);
  }

  function downloadCSV() {
    const header = "wallet,status,digest,error,timestamp\n";
    const body = filtered
      .map(
        (log) =>
          `"${log.wallet}","${log.status}","${log.digest || ""}","${log.error || ""}","${new Date(
            log.timestamp
          ).toISOString()}"`
      )
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "airdrop_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function retryAirdrop(wallet: string) {
    const res = await fetch("/api/admin/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ 재전송 완료: ${wallet}`);
      fetchLogs();
    } else {
      alert(`❌ 재전송 실패: ${wallet}`);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Airdrop Logs</h1>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <Input
          placeholder="지갑, 트랜잭션, 오류 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-[300px]"
        />
        <div className="flex items-center space-x-2">
          <Switch checked={showSuccess} onCheckedChange={setShowSuccess} />
          <span className="text-sm">성공</span>
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={showError} onCheckedChange={setShowError} />
          <span className="text-sm">실패</span>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> CSV 다운로드
        </Button>
      </div>

      <ScrollArea className="h-[75vh] border rounded-xl p-4">
        <div className="space-y-4">
          {filtered.map((log) => (
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
                  <div className="text-xs text-red-500 truncate">⚠️ Error: {log.error}</div>
                )}
                <div className="text-xs text-gray-500">
                  🕒 {new Date(log.timestamp).toLocaleString()}
                </div>
                {log.status === "error" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => retryAirdrop(log.wallet)}
                    className="mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> 재전송
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

