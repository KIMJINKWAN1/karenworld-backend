"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface QueueItem {
  id: string;
  wallet: string;
  amount: number;
  status: "queued" | "sent" | "failed";
}

export default function AdminQueue() {
  const [data, setData] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchQueue = async () => {
    const res = await fetch("/api/queue");
    const json = await res.json();
    setData(json.items || []);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const filtered = data.filter((item) => {
    const matchSearch = item.wallet.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const retry = async (wallet: string) => {
    await fetch("/api/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    fetchQueue();
  };

  const handleTabChange = (status: string) => {
    setStatusFilter(status);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="지갑 주소 검색"
          className="w-[280px]"
        />

        <div className="flex space-x-2">
          {["all", "sent", "failed", "queued"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(status)}
            >
              {status === "all"
                ? "전체"
                : status === "sent"
                ? "보냄"
                : status === "failed"
                ? "실패"
                : "대기"}
            </Button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={fetchQueue}>
          <RefreshCw className="w-4 h-4 mr-2" /> 새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-mono text-sm">{item.wallet}</div>
                <div className="text-muted-foreground text-xs">
                  Amount: {item.amount}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    item.status === "sent"
                      ? "default"
                      : item.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {item.status.toUpperCase()}
                </Badge>
                {item.status === "failed" && (
                  <Button onClick={() => retry(item.wallet)} size="sm">
                    재시도
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


