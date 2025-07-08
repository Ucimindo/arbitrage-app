import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArbitrageStatusData } from "@/lib/types";

export function useArbitrage(tokenPair: string = 'btc_usdt') {
  const [pancakePrice, setPancakePrice] = useState("0.00");
  const [quickswapPrice, setQuickswapPrice] = useState("0.00");

  const { data: arbitrageStatus, refetch: refetchStatus } = useQuery<ArbitrageStatusData>({
    queryKey: ["/api/arbitrage/status", tokenPair],
    queryFn: async () => {
      const response = await fetch(`/api/arbitrage/status?pair=${tokenPair}`);
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: wallets } = useQuery({
    queryKey: ["/api/wallets", tokenPair],
    queryFn: async () => {
      const response = await fetch(`/api/wallets?pair=${tokenPair}`);
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const updatePrices = useCallback((pancake: string, quickswap: string, pair?: string) => {
    // Only update if it's for the current token pair
    if (!pair || pair === tokenPair) {
      const decimals = getTokenDecimals(tokenPair);
      setPancakePrice(parseFloat(pancake).toFixed(decimals));
      setQuickswapPrice(parseFloat(quickswap).toFixed(decimals));
    }
  }, [tokenPair]);

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/price/pancake"] });
    queryClient.invalidateQueries({ queryKey: ["/api/price/quickswap"] });
    queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/status", tokenPair] });
    queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/history", tokenPair] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallets", tokenPair] });
  }, [tokenPair]);

  return {
    pancakePrice,
    quickswapPrice,
    arbitrageStatus,
    wallets,
    updatePrices,
    refetchStatus,
    refetchAll,
  };
}

function getTokenDecimals(tokenPair: string): number {
  const decimals = {
    'btc_usdt': 4,
    'eth_usdt': 2,
    'cake_usdt': 3,
    'link_usdt': 3,
    'wbnb_usdt': 2,
  };
  return decimals[tokenPair as keyof typeof decimals] || 4;
}
