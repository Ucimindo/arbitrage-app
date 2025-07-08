import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArbitrageStatusData } from "@/lib/types";

export function useArbitrage() {
  const [pancakePrice, setPancakePrice] = useState("43,125.45");
  const [quickswapPrice, setQuickswapPrice] = useState("43,212.77");

  const { data: arbitrageStatus, refetch: refetchStatus } = useQuery<ArbitrageStatusData>({
    queryKey: ["/api/arbitrage/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const updatePrices = useCallback((pancake: string, quickswap: string) => {
    setPancakePrice(parseFloat(pancake).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }));
    setQuickswapPrice(parseFloat(quickswap).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }));
  }, []);

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/price/pancake"] });
    queryClient.invalidateQueries({ queryKey: ["/api/price/quickswap"] });
    queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/history"] });
  }, []);

  return {
    pancakePrice,
    quickswapPrice,
    arbitrageStatus,
    updatePrices,
    refetchStatus,
    refetchAll,
  };
}
