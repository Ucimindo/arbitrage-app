import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { tokenOptions } from "./token-selector";

interface ScanResult {
  pair: string;
  priceA: string;
  priceB: string;
  spread: string;
  estimatedProfit: string;
  profitable: boolean;
  timestamp: string;
}

interface ScannerGridProps {
  onSelectPair: (pair: string) => void;
  selectedPair?: string;
}

export default function ScannerGrid({ onSelectPair, selectedPair }: ScannerGridProps) {
  const { toast } = useToast();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/scan/all");
      return response.json();
    },
    onSuccess: (data) => {
      setScanResults(data);
      toast({
        title: "Scan Complete",
        description: `Found ${data.filter((r: ScanResult) => r.profitable).length} profitable opportunities`,
      });
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Unable to scan markets",
        variant: "destructive",
      });
    },
  });

  const getTokenInfo = (pair: string) => {
    return tokenOptions.find(option => option.value === pair) || { label: pair.toUpperCase(), icon: '🪙' };
  };

  const minProfitThreshold = parseFloat(settings?.[`minProfitThreshold_btc_usdt`] || '50');

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Market Scanner</CardTitle>
          <Button 
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {scanMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <span className="mr-2">🔍</span>
            )}
            Scan Opportunities
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {scanResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Click "Scan Opportunities" to find arbitrage possibilities across all token pairs
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trading Pair</TableHead>
                  <TableHead>Price (DEX A)</TableHead>
                  <TableHead>Price (DEX B)</TableHead>
                  <TableHead>Spread</TableHead>
                  <TableHead>Est. Profit (1 unit)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanResults.map((result) => {
                  const tokenInfo = getTokenInfo(result.pair);
                  const profit = parseFloat(result.estimatedProfit);
                  const isProfitable = profit >= minProfitThreshold;
                  
                  return (
                    <TableRow 
                      key={result.pair}
                      className={`${selectedPair === result.pair ? 'bg-muted/50' : ''} ${
                        isProfitable ? 'border-l-4 border-l-green-500' : ''
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{tokenInfo.icon}</span>
                          <span>{tokenInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">${result.priceA}</TableCell>
                      <TableCell className="font-mono">${result.priceB}</TableCell>
                      <TableCell className="font-mono">${result.spread}</TableCell>
                      <TableCell className="font-mono text-green-600">${result.estimatedProfit}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={isProfitable ? "default" : "secondary"}
                          className={isProfitable ? "bg-green-600 text-white" : ""}
                        >
                          {isProfitable ? "PROFITABLE" : "NOT PROFITABLE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => onSelectPair(result.pair)}
                          disabled={!isProfitable}
                          variant={selectedPair === result.pair ? "default" : "outline"}
                          size="sm"
                        >
                          {selectedPair === result.pair ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        {scanResults.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Last scan: {new Date(scanResults[0]?.timestamp).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}