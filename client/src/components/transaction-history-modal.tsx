import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenPair?: string;
}

interface TransactionEntry {
  id: number;
  tokenPair: string;
  priceA: string;
  priceB: string;
  spread: string;
  estimatedProfit: string;
  executed: boolean;
  executionType: string;
  walletA?: string;
  walletB?: string;
  buyPrice?: string;
  sellPrice?: string;
  profit?: string;
  txHash?: string;
  executedAt: string;
}

export default function TransactionHistoryModal({ isOpen, onClose, tokenPair }: TransactionHistoryModalProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/arbitrage/history", tokenPair],
    queryFn: async () => {
      const url = tokenPair ? `/api/arbitrage/history?pair=${tokenPair}` : `/api/arbitrage/history`;
      const response = await fetch(url);
      return response.json();
    },
    enabled: isOpen,
  });

  const getQuoteSymbol = (pair: string): string => {
    if (pair.includes('_usdt')) return 'USDT';
    if (pair.includes('_usdc')) return 'USDC';
    if (pair.includes('_busd')) return 'BUSD';
    return 'USDT';
  };

  const formatTxHash = (hash: string): string => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Transaction History {tokenPair ? `- ${tokenPair.toUpperCase()}` : ''}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[600px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token Pair</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Wallet A</TableHead>
                  <TableHead>Wallet B</TableHead>
                  <TableHead>Buy Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>TX Hash</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx: TransactionEntry) => {
                  const quoteSymbol = getQuoteSymbol(tx.tokenPair);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {tx.tokenPair.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        {tx.executionType === 'auto' ? (
                          <Badge variant="secondary">[auto]</Badge>
                        ) : (
                          <Badge variant="outline">manual</Badge>
                        )}
                      </TableCell>
                      <TableCell>{tx.walletA || 'PancakeSwap'}</TableCell>
                      <TableCell>{tx.walletB || 'QuickSwap'}</TableCell>
                      <TableCell>
                        {tx.buyPrice ? `${parseFloat(tx.buyPrice).toFixed(4)} ${quoteSymbol}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {tx.sellPrice ? `${parseFloat(tx.sellPrice).toFixed(4)} ${quoteSymbol}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        +{tx.profit ? parseFloat(tx.profit).toFixed(2) : parseFloat(tx.estimatedProfit).toFixed(2)} {quoteSymbol}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTxHash(tx.txHash || '')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(tx.executedAt), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}