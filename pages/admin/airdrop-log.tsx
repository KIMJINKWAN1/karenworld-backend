import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, RefreshCw, Eye } from "lucide-react";

type AirdropLog = {
  wallet: string;
  status: "success" | "fail";
  digest?: string;
  error?: string;
  timestamp: number;
  claimedAt?: number;
  claimedAt_iso?: string;
  amount?: number;
  note?: string;
};

export default function AirdropLogPage() {
  const [logs, setLogs] = useState<AirdropLog[]>([]);
  const [filter, setFilter] = useState("");
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AirdropLog | null>(null);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((res) => res.json())
      .then(setLogs);
  }, []);

const filtered = Array.isArray(logs)
  ? logs
      .filter((log) =>
        log.wallet.toLowerCase().includes(filter.toLowerCase())
      )
      .filter((log) => (showOnlyFailed ? log.status === "fail" : true))
  : [];

  const downloadCSV = () => {
    const headers = ["wallet", "status", "digest", "error", "timestamp", "amount", "claimedAt_iso", "note"];
    const rows = logs.map((log) =>
      headers.map((h) => JSON.stringify(log[h as keyof AirdropLog] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "airdrop-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🎯 에어드랍 로그</h1>

      <div className="flex items-center gap-4">
        <Input
          placeholder="지갑 주소 필터링..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-64"
        />
        <div className="flex items-center space-x-2">
          <Switch
            checked={showOnlyFailed}
            onCheckedChange={setShowOnlyFailed}
          />
          <span>❌ 실패한 전송만 보기</span>
        </div>
        <Button variant="outline" onClick={() => location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
        <Button onClick={downloadCSV}>
          <Download className="w-4 h-4 mr-2" />
          CSV 다운로드
        </Button>
      </div>

      <ScrollArea className="h-[600px] rounded-lg border">
        <div className="p-4 space-y-4">
          {filtered.map((log, i) => (
            <Card
              key={i}
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedLog(log)}
            >
              <div className="flex justify-between items-center">
                <div className="font-mono text-sm break-all">{log.wallet}</div>
                <Badge
                  variant={log.status === "success" ? "default" : "destructive"}
                >
                  {log.status.toUpperCase()}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px] max-w-full space-y-4">
            <h2 className="text-lg font-semibold">상세 정보</h2>
            <div className="text-sm font-mono break-all">💼 Wallet: {selectedLog.wallet}</div>
            <div className="text-sm">📄 Status: {selectedLog.status}</div>
            <div className="text-sm">🔗 Digest: {selectedLog.digest || "-"}</div>
            <div className="text-sm text-red-500">⚠️ Error: {selectedLog.error || "-"}</div>
            {selectedLog.amount !== undefined && (
              <div className="text-sm">💸 수량: {selectedLog.amount} $KAREN</div>
            )}
            {selectedLog.claimedAt_iso && (
              <div className="text-sm">📅 ISO 시간: {selectedLog.claimedAt_iso}</div>
            )}
            {selectedLog.note && (
              <div className="text-sm">📝 노트: {selectedLog.note}</div>
            )}
            <div className="text-sm text-gray-500">
              🕒 {new Date(selectedLog.timestamp).toLocaleString()}
            </div>
            <Button onClick={() => setSelectedLog(null)} variant="outline" className="w-full">
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

