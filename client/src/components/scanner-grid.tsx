import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Play, Square } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { tokenOptions } from "./token-selector";
import { cn } from "@/lib/utils";

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
  onScanningChange?: (isScanning: boolean) => void;
}

export default function ScannerGrid({ onSelectPair, selectedPair, onScanningChange }: ScannerGridProps) {
  const { toast } = useToast();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  
  // Auto execution session tracking
  const sessionStart = useRef(Date.now());
  const autoExecCount = useRef(0);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    onSuccess: async (data) => {
      setScanResults(data);
      setLastScanTime(new Date());
      
      // Auto execution logic
      const autoExecute = settings?.autoExecute === "true";
      const sessionDurationSec = parseInt(settings?.sessionDurationSec || "600");
      const autoExecMaxPerSession = parseInt(settings?.autoExecMaxPerSession || "5");
      
      if (autoExecute && isScanning) {
        const now = Date.now();
        const sessionElapsed = now - sessionStart.current;
        const sessionExpired = sessionElapsed > sessionDurationSec * 1000;
        const maxTradesReached = autoExecCount.current >= autoExecMaxPerSession;
        
        if (!sessionExpired && !maxTradesReached) {
          // Find profitable opportunities and execute automatically
          const profitablePairs = data.filter((r: ScanResult) => r.profitable);
          
          for (const pair of profitablePairs.slice(0, 1)) { // Execute one at a time
            if (autoExecCount.current < autoExecMaxPerSession) {
              try {
                await executeArbitrage(pair.pair, "auto");
                autoExecCount.current += 1;
                toast({
                  title: "Auto Execution",
                  description: `Executed arbitrage for ${pair.pair.toUpperCase()} [auto]`,
                });
                break; // Only execute one per scan cycle
              } catch (error) {
                console.error("Auto execution failed:", error);
              }
            }
          }
        } else if (sessionExpired || maxTradesReached) {
          // Stop scanner when session limits are reached
          stopScanning();
          toast({
            title: "Auto Execution Stopped",
            description: sessionExpired 
              ? `Session expired after ${Math.floor(sessionDurationSec / 60)} minutes`
              : `Maximum ${autoExecMaxPerSession} auto trades reached`,
            variant: "destructive",
          });
        }
      }
      
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

  // Auto execute function
  const executeArbitrage = async (tokenPair: string, executionType: "auto" | "manual" = "manual") => {
    const response = await apiRequest("POST", "/api/arbitrage/execute", {
      tokenPair,
      executionType,
    });
    return response.json();
  };

  const startScanning = async () => {
    // Load fresh settings from backend before starting
    await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    
    setIsScanning(true);
    onScanningChange?.(true);
    
    // Reset session tracking
    sessionStart.current = Date.now();
    autoExecCount.current = 0;
    
    // Immediate scan
    scanMutation.mutate();
    
    // Set up interval with configurable timing
    const scannerIntervalSec = parseInt(settings?.scannerIntervalSec || "5");
    intervalRef.current = setInterval(() => {
      scanMutation.mutate();
    }, scannerIntervalSec * 1000);
  };

  const stopScanning = () => {
    setIsScanning(false);
    onScanningChange?.(false);
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

  const getQuoteSymbol = (pair: string) => {
    return pair.split("_")[1].toUpperCase(); // e.g., btc_usdt → USDT
  };

  const minProfitThreshold = parseFloat(settings?.[`minProfitThreshold_btc_usdt`] || '50');
  
  // Find the best spread for highlighting
  const bestSpread = scanResults.length > 0 
    ? Math.max(...scanResults.map(r => parseFloat(r.spread))) 
    : 0;
  
  // Find the most profitable opportunity
  const mostProfitableAmount = scanResults.length > 0
    ? Math.max(...scanResults.map(r => parseFloat(r.estimatedProfit)))
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
              {isScanning && (
                <span className="text-sm text-muted-foreground">
                  Next scan in {settings?.scannerIntervalSec || '5'} seconds
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
                  const quoteSymbol = getQuoteSymbol(result.pair);
                  const profit = parseFloat(result.estimatedProfit);
                  const spread = parseFloat(result.spread);
                  const isProfitable = profit >= minProfitThreshold;
                  const isBestSpread = spread === bestSpread && spread > 0;
                  const isMostProfitable = profit === mostProfitableAmount && profit > 0;
                  const isSelected = selectedPair === result.pair;
                  
                  return (
                    <TableRow 
                      key={result.pair}
                      className={cn(
                        "transition-all duration-300",
                        isSelected && isMostProfitable
                          ? "border-l-4 border-yellow-400 bg-muted/70"
                          : isSelected
                          ? "bg-muted/50"
                          : isMostProfitable
                          ? "border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-900/10"
                          : isProfitable
                          ? "border-l-4 border-green-500"
                          : ""
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{tokenInfo.icon}</span>
                          <span>{tokenInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {result.priceA} <span className="text-xs text-muted-foreground">{quoteSymbol}</span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {result.priceB} <span className="text-xs text-muted-foreground">{quoteSymbol}</span>
                      </TableCell>
                      <TableCell className={cn(
                        "font-mono",
                        isBestSpread && "text-yellow-600 dark:text-yellow-400 font-bold"
                      )}>
                        {result.spread} <span className="text-xs text-muted-foreground">{quoteSymbol}</span>
                        {isBestSpread && <span className="ml-1">⭐</span>}
                      </TableCell>
                      <TableCell className={cn(
                        "font-mono text-green-600",
                        isMostProfitable && "font-bold text-orange-600 dark:text-orange-400"
                      )}>
                        {result.estimatedProfit} <span className="text-xs text-muted-foreground">{quoteSymbol}</span>
                        {isMostProfitable && <span className="ml-1">🔥</span>}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isMostProfitable ? "default" : isProfitable ? "default" : "secondary"}
                          className={cn(
                            isMostProfitable 
                              ? "bg-orange-600 text-white font-bold" 
                              : isProfitable 
                              ? "bg-green-600 text-white" 
                              : ""
                          )}
                        >
                          {isMostProfitable 
                            ? "🔥 BEST PROFIT" 
                            : isProfitable 
                            ? "PROFITABLE" 
                            : "NOT PROFITABLE"
                          }
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