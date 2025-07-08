export interface ArbitrageStatusData {
  spread: string;
  drift: string;
  estimatedProfit: string;
  profitable: boolean;
  priceA: string;
  priceB: string;
}

export interface PriceData {
  price: string;
  timestamp: string;
}

export interface WalletData {
  id: number;
  name: string;
  chain: string;
  dex: string;
  tokenPair: string;
  baseBalance: string;
  quoteBalance: string;
  lastUpdated: string;
}
