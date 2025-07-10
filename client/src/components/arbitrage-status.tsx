import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArbitrageStatusData } from "@/lib/types";
import { tokenOptions } from "./token-selector";

interface ArbitrageStatusProps {
  arbitrageStatus: ArbitrageStatusData | null;
  tokenPair: string;
}

export default function ArbitrageStatus({ arbitrageStatus, tokenPair }: ArbitrageStatusProps) {
  const { toast } = useToast();
  const [executionResult, setExecutionResult] = useState<any>(null);
  const selectedToken = tokenOptions.find(option => option.value === tokenPair);
  const baseSymbol = selectedToken?.symbol || 'TOKEN';
  const baseIcon = selectedToken?.icon || '🪙';
  const quoteSymbol = tokenPair.split("_")[1].toUpperCase();

  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/arbitrage/execute", { 
        tokenPair, 
        executionType: "manual" 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      toast({
        title: "Arbitrage Executed",
        description: `Profit: $${data.totalProfit} ${quoteSymbol}`,
      });
      // Refresh relevant queries
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

  if (!arbitrageStatus) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-center">Arbitrage Status</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isProfitable = arbitrageStatus.profitable;
  const statusColor = isProfitable ? "bg-green-500/20 border-green-500 text-green-400" : "bg-red-500/20 border-red-500 text-red-400";
  const statusText = isProfitable ? "PROFITABLE" : "NOT PROFITABLE";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-center mb-2">Arbitrage Status</CardTitle>
        <div className="text-center">
          <Badge className={`${statusColor} font-semibold px-4 py-2`}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Price Spread</div>
          <div className={`text-3xl font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
            {parseFloat(arbitrageStatus.spread) >= 0 ? '+' : ''}${arbitrageStatus.spread}
          </div>
          <div className="text-sm text-muted-foreground">
            {((parseFloat(arbitrageStatus.spread) / parseFloat(arbitrageStatus.priceA)) * 100).toFixed(2)}%
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Price Drift (5s)</div>
          <div className={`text-lg font-mono ${parseFloat(arbitrageStatus.drift) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {parseFloat(arbitrageStatus.drift) >= 0 ? '+' : ''}${arbitrageStatus.drift}
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1 flex items-center justify-center space-x-1">
            <span>{baseIcon}</span>
            <span>Est. Profit (1 {baseSymbol})</span>
          </div>
          <div className={`text-2xl font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
            ${arbitrageStatus.estimatedProfit}
          </div>
          <div className="text-sm text-muted-foreground">After fees</div>
        </div>
        
        <Button 
          className={`w-full ${isProfitable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} text-white font-bold py-4 text-lg`}
          onClick={() => executeMutation.mutate()}
          disabled={!isProfitable || executeMutation.isPending}
        >
          {executeMutation.isPending ? "Executing..." : "Execute Arbitrage"}
        </Button>

        {/* Execution Result Display */}
        {executionResult && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="text-center mb-3">
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  ✅ Arbitrage Executed Successfully
                </div>
                <div className="text-2xl font-mono text-green-700 dark:text-green-300">
                  Profit: ${executionResult.totalProfit} {quoteSymbol}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BSC Transaction:</span>
                  <span className="font-mono text-xs">
                    {executionResult.txA?.status === "success" ? "✅" : "❌"} 
                    {executionResult.txA?.hash?.slice(0, 10)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Polygon Transaction:</span>
                  <span className="font-mono text-xs">
                    {executionResult.txB?.status === "success" ? "✅" : "❌"} 
                    {executionResult.txB?.hash?.slice(0, 10)}...
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
