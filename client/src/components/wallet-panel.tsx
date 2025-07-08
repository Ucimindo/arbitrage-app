import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tokenOptions } from "./token-selector";

interface WalletPanelProps {
  title: string;
  chain: string;
  chainColor: string;
  price: string;
  baseBalance: string;
  quoteBalance: string;
  gasEstimate: string;
  buttonText: string;
  buttonColor: string;
  tokenPair: string;
  isQuickSwap?: boolean;
}

export default function WalletPanel({
  title,
  chain,
  chainColor,
  price,
  baseBalance,
  quoteBalance,
  gasEstimate,
  buttonText,
  buttonColor,
  tokenPair,
  isQuickSwap = false
}: WalletPanelProps) {
  const selectedToken = tokenOptions.find(option => option.value === tokenPair);
  const baseSymbol = selectedToken?.symbol || 'TOKEN';
  const baseIcon = selectedToken?.icon || '🪙';
  
  // Special handling for wrapped tokens on different chains
  const displayBaseSymbol = isQuickSwap && baseSymbol === 'BTC' ? 'WBTC' : 
                           isQuickSwap && baseSymbol === 'WBNB' ? 'WMATIC' : baseSymbol;
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge className={chainColor}>{chain}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center space-x-1">
              <span>{baseIcon}</span>
              <span>{displayBaseSymbol} Balance</span>
            </div>
            <div className="text-xl font-mono text-foreground">
              {parseFloat(baseBalance).toFixed(baseSymbol === 'BTC' ? 6 : baseSymbol === 'ETH' ? 4 : 2)}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              USDT Balance
            </div>
            <div className="text-xl font-mono text-foreground">
              {parseFloat(quoteBalance).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center space-x-1">
            <span>{baseIcon}</span>
            <span>Current {baseSymbol} Price</span>
          </div>
          <div className="text-2xl font-mono text-foreground">${price}</div>
          <div className="text-sm text-green-500 mt-1">Live</div>
        </div>
        
        <div className="bg-muted rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Gas Estimate</div>
          <div className="text-lg font-mono text-foreground">{gasEstimate}</div>
        </div>
        
        <Button className={`w-full ${buttonColor} text-white font-medium py-3`}>
          {buttonText} {baseSymbol}
        </Button>
      </CardContent>
    </Card>
  );
}
