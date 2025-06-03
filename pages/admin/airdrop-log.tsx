import { useEffect, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Download, RefreshCw, Eye } from "lucide-react";

interface AirdropLog {
  id: string;
  wallet: string;
  status: "success" | "error";
  digest?: string;
  error?: string;
  timestamp: number;
  slackNotified?: boolean;
}

export default function AirdropLogPage() {
  const [logs, setLogs] = useState<AirdropLog[]>([]);
  const [filtered, setFiltered] = useState<AirdropLog[]>([]);
  const [query, setQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(true);
  const [showError, setShowError] = useState(true);
  const [sortOption, setSortOption] = useState("recent");
  const [selectedLog, setSelectedLog] = useState<AirdropLog | null>(null);
  const [walletInput, setWalletInput] = useState("");

  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, query, showSuccess, showError, sortOption, currentPage]);

  async function fetchLogs() {
    const res = await fetch("/api/admin/logs");
    const data = await res.json();
    setLogs(data.logs);
  }

  function filterLogs() {
    const q = query.toLowerCase();
    let result = logs.filter((log) => {
      const matchQuery =
        log.wallet.toLowerCase().includes(q) ||
        log.digest?.toLowerCase().includes(q) ||
        log.error?.toLowerCase().includes(q);
      const matchStatus =
        (showSuccess && log.status === "success") ||
        (showError && log.status === "error");
      return matchQuery && matchStatus;
    });

    if (sortOption === "oldest") {
      result.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      result.sort((a, b) => b.timestamp - a.timestamp);
    }

    setFiltered(result.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage));
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

  async function queueWallet() {
    if (!walletInput.trim()) return;
    const res = await fetch("/api/admin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: walletInput.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      alert("🎯 지갑이 큐에 추가되었습니다.");
      setWalletInput("");
    } else {
      alert("⚠️ 추가 실패: " + data.message);
    }
  }

  const totalPages = Math.ceil(
    logs.filter(
      (log) =>
        ((showSuccess && log.status === "success") ||
          (showError && log.status === "error")) &&
        (log.wallet.toLowerCase().includes(query.toLowerCase()) ||
          log.digest?.toLowerCase().includes(query.toLowerCase()) ||
          log.error?.toLowerCase().includes(query.toLowerCase()))
    ).length / itemsPerPage
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Airdrop Logs</h1>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <Input
          placeholder="지갑, 트랜잭션, 오류 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-[250px]"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="recent">최신순</option>
          <option value="oldest">오래된 순</option>
        </select>
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

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="지갑 주소 수동 추가"
          value={walletInput}
          onChange={(e) => setWalletInput(e.target.value)}
          className="w-[300px]"
        />
        <Button onClick={queueWallet} variant="secondary">
          + 큐에 추가
        </Button>
      </div>

      <ScrollArea className="h-[75vh] border rounded-xl p-4">
        <div className="space-y-4">
          {filtered.map((log) => (
            <Card key={log.id} className="bg-white cursor-pointer" onClick={() => setSelectedLog(log)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{log.wallet}</span>
                  <div className="flex gap-2">
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>
                      {log.status.toUpperCase()}
                    </Badge>
                    {log.slackNotified && <Badge variant="secondary">Slack✅</Badge>}
                  </div>
                </div>
                {log.digest && <div className="text-xs text-muted-foreground truncate">🔗 Tx: {log.digest}</div>}
                {log.error && <div className="text-xs text-red-500 truncate">⚠️ Error: {log.error}</div>}
                <div className="text-xs text-gray-500">🕒 {new Date(log.timestamp).toLocaleString()}</div>
                {log.status === "error" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryAirdrop(log.wallet);
                    }}
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

      <div className="flex justify-center mt-4 gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 rounded border text-sm ${
              currentPage === page ? "bg-black text-white" : "bg-white"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px] max-w-full space-y-4">
            <h2 className="text-lg font-semibold">상세 정보</h2>
            <div className="text-sm font-mono break-all">💼 Wallet: {selectedLog.wallet}</div>
            <div className="text-sm">📄 Status: {selectedLog.status}</div>
            <div className="text-sm">🔗 Digest: {selectedLog.digest || "-"}</div>
            <div className="text-sm text-red-500">⚠️ Error: {selectedLog.error || "-"}</div>
            <div className="text-sm text-gray-500">🕒 {new Date(selectedLog.timestamp).toLocaleString()}</div>
            <Button onClick={() => setSelectedLog(null)} variant="outline" className="w-full">
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

