import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { tokenOptions } from "./token-selector";

interface ArbitrageDetailProps {
  tokenPair: string;
}

interface WalletDetail {
  id: number;
  name: string;
  chain: string;
  dex: string;
  baseBalance: string;
  quoteBalance: string;
  currentPrice: string;
  gasEstimate: string;
}

interface ArbitrageDetail {
  pair: string;
  walletA: WalletDetail;
  walletB: WalletDetail;
  spread: string;
  drift: string;
  estimatedProfit: string;
  profitable: boolean;
  timestamp: string;
}

export default function ArbitrageDetailPanel({ tokenPair }: ArbitrageDetailProps) {
  const { toast } = useToast();
  const [executionStatus, setExecutionStatus] = useState<{txA?: string, txB?: string}>({});

  const { data: detail, isLoading } = useQuery<ArbitrageDetail>({
    queryKey: ["/api/arbitrage/detail", tokenPair],
    queryFn: async () => {
      const response = await fetch(`/api/arbitrage/detail?pair=${tokenPair}`);
      return response.json();
    },
    enabled: !!tokenPair,
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/arbitrage/execute", { 
        tokenPair, 
        executionType: "manual" 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setExecutionStatus({ txA: data.txA?.hash, txB: data.txB?.hash });
      toast({
        title: "Arbitrage Executed", 
        description: `Profit: $${data.totalProfit} ${tokenPair.split("_")[1].toUpperCase()}`,
      });
      // Refresh wallet data
      queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/detail", tokenPair] });
      queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message?.includes("threshold") 
        ? error.message 
        : "Failed to execute arbitrage";
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading arbitrage details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return null;
  }

  const tokenInfo = tokenOptions.find(option => option.value === tokenPair);
  const baseSymbol = tokenInfo?.symbol || 'TOKEN';
  const baseIcon = tokenInfo?.icon || '🪙';
  const quoteSymbol = tokenPair.split("_")[1].toUpperCase(); // e.g., btc_usdt → USDT
  const isProfitable = detail.profitable;

  const WalletCard = ({ wallet, title, chainColor }: {
    wallet: WalletDetail;
    title: string;
    chainColor: string;
  }) => (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <Badge className={chainColor}>{wallet.chain.toUpperCase()}</Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-sm text-muted-foreground flex items-center space-x-1">
            <span>{baseIcon}</span>
            <span>{baseSymbol} Balance</span>
          </div>
          <div className="text-lg font-mono text-foreground">
            {parseFloat(wallet.baseBalance).toFixed(baseSymbol === 'BTC' ? 6 : 4)}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{quoteSymbol} Balance</div>
          <div className="text-lg font-mono text-foreground">
            {parseFloat(wallet.quoteBalance).toFixed(2)} <span className="text-xs text-muted-foreground">{quoteSymbol}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Current Price:</span>
          <span className="font-mono">{wallet.currentPrice} <span className="text-xs text-muted-foreground">{quoteSymbol}</span></span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Gas Estimate:</span>
          <span className="font-mono text-sm">{wallet.gasEstimate}</span>
        </div>
      </div>

      {executionStatus.txA && wallet.dex === 'pancake' && (
        <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-sm">
          ✅ Buy executed: {executionStatus.txA}
        </div>
      )}
      {executionStatus.txB && wallet.dex === 'quickswap' && (
        <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-sm">
          ✅ Sell executed: {executionStatus.txB}
        </div>
      )}
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>{baseIcon}</span>
            <span>Arbitrage Detail: {tokenInfo?.label}</span>
          </CardTitle>
          <Badge variant={isProfitable ? "default" : "secondary"} 
                 className={isProfitable ? "bg-green-600 text-white" : ""}>
            {isProfitable ? "PROFITABLE" : "NOT PROFITABLE"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Arbitrage Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Price Spread</div>
            <div className="text-xl font-mono text-foreground">
              {detail.spread} <span className="text-sm text-muted-foreground">{quoteSymbol}</span>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Price Drift</div>
            <div className={`text-xl font-mono ${
              parseFloat(detail.drift) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {parseFloat(detail.drift) >= 0 ? '+' : ''}{detail.drift} <span className="text-sm text-muted-foreground">{quoteSymbol}</span>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Est. Profit (1 {baseSymbol})</div>
            <div className={`text-xl font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {detail.estimatedProfit} <span className="text-sm text-muted-foreground">{quoteSymbol}</span>
            </div>
          </div>
        </div>

        {/* Dual Wallet Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WalletCard 
            wallet={detail.walletA}
            title="Wallet A - PancakeSwap"
            chainColor="bg-yellow-500/20 text-yellow-400"
          />
          <WalletCard 
            wallet={detail.walletB}
            title="Wallet B - QuickSwap"
            chainColor="bg-purple-500/20 text-purple-400"
          />
        </div>

        {/* Execution */}
        <div className="space-y-4">
          <Button
            onClick={() => executeMutation.mutate()}
            disabled={!isProfitable || executeMutation.isPending}
            className={`w-full ${
              isProfitable 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
            } font-semibold py-3`}
          >
            {executeMutation.isPending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executing Arbitrage...
              </div>
            ) : (
              "🚀 Execute Arbitrage"
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(detail.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}