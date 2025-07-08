import { useState } from "react";
import Navbar from "./navbar";
import ScannerGrid from "./scanner-grid";
import ArbitrageDetailPanel from "./arbitrage-detail-panel";
import TransactionLog from "./transaction-log";
import SettingsPanel from "./settings-panel";
import { useWebSocket } from "@/hooks/use-websocket";

export default function ArbitrageDashboard() {
  const [selectedTokenPair, setSelectedTokenPair] = useState<string>('');
  const { isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isConnected={isConnected} />
      
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Scanner Grid */}
        <ScannerGrid 
          onSelectPair={setSelectedTokenPair}
          selectedPair={selectedTokenPair}
        />

        {/* Arbitrage Detail Panel (shown when pair is selected) */}
        {selectedTokenPair && (
          <ArbitrageDetailPanel tokenPair={selectedTokenPair} />
        )}

        {/* Bottom Panel - Transaction Logs & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionLog tokenPair={selectedTokenPair || 'btc_usdt'} />
          <SettingsPanel tokenPair={selectedTokenPair || 'btc_usdt'} />
        </div>
      </div>
    </div>
  );
}
