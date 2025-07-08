import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArbitrageStatusData } from "@/lib/types";

interface ArbitrageStatusProps {
  arbitrageStatus: ArbitrageStatusData | null;
}

export default function ArbitrageStatus({ arbitrageStatus }: ArbitrageStatusProps) {
  const { toast } = useToast();

  const handleExecuteArbitrage = async () => {
    try {
      const response = await apiRequest("POST", "/api/arbitrage/execute");
      const result = await response.json();
      
      toast({
        title: "Arbitrage Executed",
        description: `Profit: $${result.profit}`,
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute arbitrage",
        variant: "destructive",
      });
    }
  };

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
          <div className="text-sm text-muted-foreground mb-1">Est. Profit (1 BTC)</div>
          <div className={`text-2xl font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
            ${arbitrageStatus.estimatedProfit}
          </div>
          <div className="text-sm text-muted-foreground">After fees</div>
        </div>
        
        <Button 
          className={`w-full ${isProfitable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} text-white font-bold py-4 text-lg`}
          onClick={handleExecuteArbitrage}
          disabled={!isProfitable}
        >
          Execute Arbitrage
        </Button>
      </CardContent>
    </Card>
  );
}
