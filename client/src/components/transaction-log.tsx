import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { Download, FileText, Database } from "lucide-react";
import { tokenOptions } from "./token-selector";
import TransactionHistoryModal from "./transaction-history-modal";

interface ArbitrageLogEntry {
  id: number;
  tokenPair: string;
  priceA: string;
  priceB: string;
  spread: string;
  estimatedProfit: string;
  executed: boolean;
  executionType?: string;
  walletA?: string;
  walletB?: string;
  buyPrice?: string;
  sellPrice?: string;
  profit?: string;
  txHash?: string;
  executedAt: string;
}

interface TransactionLogProps {
  tokenPair: string;
}

export default function TransactionLog({ tokenPair }: TransactionLogProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const { data: history, isLoading } = useQuery<ArbitrageLogEntry[]>({
    queryKey: ["/api/arbitrage/history", tokenPair],
    queryFn: async () => {
      const response = await fetch(`/api/arbitrage/history?pair=${tokenPair}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const selectedToken = tokenOptions.find(option => option.value === tokenPair);
  const tokenLabel = selectedToken?.label || 'TOKEN/USDT';

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history && history.length > 0 ? (
          history.slice(0, 5).map((entry) => (
            <div 
              key={entry.id}
              className={`bg-muted rounded-lg p-4 border-l-4 ${
                entry.executed ? 'border-green-500' : 'border-yellow-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {entry.executed ? 'Arbitrage Executed' : 'Opportunity Missed'}
                    {entry.executionType === "auto" && <span className="text-yellow-500 ml-1">[auto]</span>}
                  </div>
                  <div className="text-foreground font-mono">{tokenLabel}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono ${
                    entry.executed ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {entry.executed ? '+' : ''}${parseFloat(entry.estimatedProfit).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.executedAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground">No transactions yet</div>
        )}
        
        <div className="mt-4 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setIsHistoryModalOpen(true)}>
            View All Transactions
          </Button>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open("/api/arbitrage/export/csv", "_blank")}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open("/api/arbitrage/export/json", "_blank")}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </CardContent>
      
      <TransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        tokenPair={tokenPair}
      />
    </Card>
  );
}
