import { useState } from "react";
import Navbar from "./navbar";
import ScannerGrid from "./scanner-grid";
import ArbitrageDetailPanel from "./arbitrage-detail-panel";
import TransactionLog from "./transaction-log";
import SettingsModal from "./settings-modal";
import { useWebSocket } from "@/hooks/use-websocket";

export default function ArbitrageDashboard() {
  const [selectedTokenPair, setSelectedTokenPair] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar 
        isConnected={isConnected} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
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

        {/* Transaction Log (full width) */}
        <TransactionLog tokenPair={selectedTokenPair || 'btc_usdt'} />
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
