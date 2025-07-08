import { useEffect, useState } from "react";
import Navbar from "./navbar";
import WalletPanel from "./wallet-panel";
import ArbitrageStatus from "./arbitrage-status";
import TransactionLog from "./transaction-log";
import SettingsPanel from "./settings-panel";
import TokenSelector from "./token-selector";
import { useWebSocket } from "@/hooks/use-websocket";
import { useArbitrage } from "@/hooks/use-arbitrage";
import { WalletData } from "@/lib/types";

export default function ArbitrageDashboard() {
  const [selectedTokenPair, setSelectedTokenPair] = useState('btc_usdt');
  const { isConnected, lastMessage } = useWebSocket();
  const { 
    pancakePrice, 
    quickswapPrice, 
    arbitrageStatus,
    wallets,
    updatePrices, 
    refetchStatus 
  } = useArbitrage(selectedTokenPair);

  useEffect(() => {
    if (lastMessage) {
      const message = JSON.parse(lastMessage);
      
      if (message.type === 'price_update') {
        updatePrices(message.data.pancake, message.data.quickswap, message.data.tokenPair);
      } else if (message.type === 'arbitrage_status') {
        refetchStatus();
      }
    }
  }, [lastMessage, updatePrices, refetchStatus]);

  // Find wallets for current token pair
  const pancakeWallet = wallets?.find((w: WalletData) => w.dex === 'pancake' && w.tokenPair === selectedTokenPair);
  const quickswapWallet = wallets?.find((w: WalletData) => w.dex === 'quickswap' && w.tokenPair === selectedTokenPair);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isConnected={isConnected} />
      
      <div className="container mx-auto px-6 py-6">
        {/* Token Selector */}
        <TokenSelector 
          selectedPair={selectedTokenPair} 
          onPairChange={setSelectedTokenPair} 
        />

        {/* Main Panel - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <WalletPanel
            title="Wallet A - PancakeSwap"
            chain="BNB Chain"
            chainColor="bg-yellow-500/20 text-yellow-400"
            price={pancakePrice}
            baseBalance={pancakeWallet?.baseBalance || "0.00"}
            quoteBalance={pancakeWallet?.quoteBalance || "0.00"}
            gasEstimate="0.0023 BNB (~$0.85)"
            buttonText="Buy"
            buttonColor="bg-green-600 hover:bg-green-700"
            tokenPair={selectedTokenPair}
          />
          
          <ArbitrageStatus 
            arbitrageStatus={arbitrageStatus} 
            tokenPair={selectedTokenPair}
          />
          
          <WalletPanel
            title="Wallet B - QuickSwap"
            chain="Polygon"
            chainColor="bg-purple-500/20 text-purple-400"
            price={quickswapPrice}
            baseBalance={quickswapWallet?.baseBalance || "0.00"}
            quoteBalance={quickswapWallet?.quoteBalance || "0.00"}
            gasEstimate="0.12 MATIC (~$0.05)"
            buttonText="Sell"
            buttonColor="bg-red-600 hover:bg-red-700"
            tokenPair={selectedTokenPair}
            isQuickSwap={true}
          />
        </div>

        {/* Bottom Panel - Transaction Logs & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionLog tokenPair={selectedTokenPair} />
          <SettingsPanel tokenPair={selectedTokenPair} />
        </div>
      </div>
    </div>
  );
}
