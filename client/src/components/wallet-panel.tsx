import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WalletPanelProps {
  title: string;
  chain: string;
  chainColor: string;
  price: string;
  usdtBalance: string;
  btcBalance: string;
  gasEstimate: string;
  buttonText: string;
  buttonColor: string;
  isWBTC?: boolean;
}

export default function WalletPanel({
  title,
  chain,
  chainColor,
  price,
  usdtBalance,
  btcBalance,
  gasEstimate,
  buttonText,
  buttonColor,
  isWBTC = false
}: WalletPanelProps) {
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
            <div className="text-sm text-muted-foreground mb-1">
              {isWBTC ? 'WBTC Balance' : 'USDT Balance'}
            </div>
            <div className="text-xl font-mono text-foreground">
              {isWBTC ? btcBalance : usdtBalance}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {isWBTC ? 'USDT Balance' : 'BTCB Balance'}
            </div>
            <div className="text-xl font-mono text-foreground">
              {isWBTC ? usdtBalance : btcBalance}
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Current BTC Price</div>
          <div className="text-2xl font-mono text-foreground">${price}</div>
          <div className="text-sm text-green-500 mt-1">+0.25% (5s)</div>
        </div>
        
        <div className="bg-muted rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Gas Estimate</div>
          <div className="text-lg font-mono text-foreground">{gasEstimate}</div>
        </div>
        
        <Button className={`w-full ${buttonColor} text-white font-medium py-3`}>
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
