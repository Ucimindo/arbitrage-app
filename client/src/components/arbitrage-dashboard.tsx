import { useEffect } from "react";
import Navbar from "./navbar";
import WalletPanel from "./wallet-panel";
import ArbitrageStatus from "./arbitrage-status";
import TransactionLog from "./transaction-log";
import SettingsPanel from "./settings-panel";
import { useWebSocket } from "@/hooks/use-websocket";
import { useArbitrage } from "@/hooks/use-arbitrage";

export default function ArbitrageDashboard() {
  const { isConnected, lastMessage } = useWebSocket();
  const { 
    pancakePrice, 
    quickswapPrice, 
    arbitrageStatus, 
    updatePrices, 
    refetchStatus 
  } = useArbitrage();

  useEffect(() => {
    if (lastMessage) {
      const message = JSON.parse(lastMessage);
      
      if (message.type === 'price_update') {
        updatePrices(message.data.pancake, message.data.quickswap);
      } else if (message.type === 'arbitrage_status') {
        refetchStatus();
      }
    }
  }, [lastMessage, updatePrices, refetchStatus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isConnected={isConnected} />
      
      <div className="container mx-auto px-6 py-6">
        {/* Main Panel - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <WalletPanel
            title="Wallet A - PancakeSwap"
            chain="BNB Chain"
            chainColor="bg-yellow-500/20 text-yellow-400"
            price={pancakePrice}
            usdtBalance="2,450.67"
            btcBalance="0.0523"
            gasEstimate="0.0023 BNB (~$0.85)"
            buttonText="Buy BTC"
            buttonColor="bg-green-600 hover:bg-green-700"
          />
          
          <ArbitrageStatus arbitrageStatus={arbitrageStatus} />
          
          <WalletPanel
            title="Wallet B - QuickSwap"
            chain="Polygon"
            chainColor="bg-purple-500/20 text-purple-400"
            price={quickswapPrice}
            usdtBalance="1,823.92"
            btcBalance="0.0847"
            gasEstimate="0.12 MATIC (~$0.05)"
            buttonText="Sell BTC"
            buttonColor="bg-red-600 hover:bg-red-700"
            isWBTC={true}
          />
        </div>

        {/* Bottom Panel - Transaction Logs & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionLog />
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
