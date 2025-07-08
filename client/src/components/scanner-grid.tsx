import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Play, Square } from "lucide-react";
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
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const SCAN_INTERVAL = 5000; // 5 seconds

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
      setLastScanTime(new Date());
      
      if (!isScanning) {
        // Only show toast for manual scans
        toast({
          title: "Scan Complete",
          description: `Found ${data.filter((r: ScanResult) => r.profitable).length} profitable opportunities`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Unable to scan markets",
        variant: "destructive",
      });
      // Stop scanning on error
      if (isScanning) {
        stopScanning();
      }
    },
  });

  const startScanning = () => {
    setIsScanning(true);
    // Immediate scan
    scanMutation.mutate();
    // Set up interval
    intervalRef.current = setInterval(() => {
      scanMutation.mutate();
    }, SCAN_INTERVAL);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getTokenInfo = (pair: string) => {
    return tokenOptions.find(option => option.value === pair) || { label: pair.toUpperCase(), icon: '🪙' };
  };

  const minProfitThreshold = parseFloat(settings?.[`minProfitThreshold_btc_usdt`] || '50');
  
  // Find the best spread for highlighting
  const bestSpread = scanResults.length > 0 
    ? Math.max(...scanResults.map(r => parseFloat(r.spread))) 
    : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Market Scanner</CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <Badge 
                variant={isScanning ? "default" : "secondary"}
                className={isScanning ? "bg-green-600 text-white animate-pulse" : ""}
              >
                {isScanning ? "Running..." : "Stopped"}
              </Badge>
              {lastScanTime && (
                <span className="text-sm text-muted-foreground">
                  Last scan: {lastScanTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isScanning && (
              <Button 
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                variant="outline"
                size="sm"
              >
                {scanMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Manual Scan
              </Button>
            )}
            <Button 
              onClick={toggleScanning}
              disabled={scanMutation.isPending}
              className={isScanning 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {isScanning ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Scanner
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {scanResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isScanning 
              ? "Scanning for arbitrage opportunities..." 
              : "Click 'Start Scanner' to begin monitoring arbitrage possibilities across all token pairs"
            }
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
                  const spread = parseFloat(result.spread);
                  const isProfitable = profit >= minProfitThreshold;
                  const isBestSpread = spread === bestSpread && spread > 0;
                  
                  return (
                    <TableRow 
                      key={result.pair}
                      className={`${selectedPair === result.pair ? 'bg-muted/50' : ''} ${
                        isProfitable ? 'border-l-4 border-l-green-500' : ''
                      } ${isBestSpread ? 'bg-yellow-50 dark:bg-yellow-900/20 font-semibold' : ''} 
                      transition-colors duration-300`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{tokenInfo.icon}</span>
                          <span>{tokenInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">${result.priceA}</TableCell>
                      <TableCell className="font-mono">${result.priceB}</TableCell>
                      <TableCell className={`font-mono ${isBestSpread ? 'text-yellow-600 dark:text-yellow-400 font-bold' : ''}`}>
                        ${result.spread}
                        {isBestSpread && <span className="ml-1">⭐</span>}
                      </TableCell>
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
          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Profitable opportunities: {scanResults.filter(r => parseFloat(r.estimatedProfit) >= minProfitThreshold).length} of {scanResults.length}
            </div>
            {isScanning && (
              <div className="text-blue-600 dark:text-blue-400">
                Next scan in {SCAN_INTERVAL / 1000} seconds
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}