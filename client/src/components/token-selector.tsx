import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface TokenOption {
  value: string;
  label: string;
  symbol: string;
  icon: string;
}

interface TokenSelectorProps {
  selectedPair: string;
  onPairChange: (pair: string) => void;
}

const tokenOptions: TokenOption[] = [
  { value: 'btc_usdt', label: 'BTC/USDT', symbol: 'BTC', icon: '₿' },
  { value: 'eth_usdt', label: 'ETH/USDT', symbol: 'ETH', icon: 'Ξ' },
  { value: 'cake_usdt', label: 'CAKE/USDT', symbol: 'CAKE', icon: '🥞' },
  { value: 'link_usdt', label: 'LINK/USDT', symbol: 'LINK', icon: '🔗' },
  { value: 'wbnb_usdt', label: 'WBNB/USDT', symbol: 'WBNB', icon: '🟡' },
];

export default function TokenSelector({ selectedPair, onPairChange }: TokenSelectorProps) {
  const selectedToken = tokenOptions.find(option => option.value === selectedPair);

  return (
    <Card className="bg-card border-border mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-sm text-muted-foreground">Trading Pair:</div>
          <Select value={selectedPair} onValueChange={onPairChange}>
            <SelectTrigger className="w-48 bg-muted border-border">
              <SelectValue>
                {selectedToken && (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{selectedToken.icon}</span>
                    <span className="font-semibold">{selectedToken.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tokenOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-semibold">{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export { tokenOptions };
export type { TokenOption };