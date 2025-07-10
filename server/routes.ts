import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPriceSchema, insertArbitrageLogSchema, insertSettingSchema } from "@shared/schema";
import { signerA, signerB, getWalletBalances, getNetworkInfo } from "./wallet";
import { executeSwap, getChainConfig, isSupportedChain, type SwapParams } from "./executor";
import { z } from "zod";
import { format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Test wallet connection and balances
  app.get('/api/wallet/info', async (req, res) => {
    try {
      const networkInfo = getNetworkInfo();
      const balances = await getWalletBalances();
      
      res.json({
        networks: networkInfo,
        balances,
        signers: {
          walletA: {
            address: signerA.address,
            provider: signerA.provider?.connection?.url || 'Connected'
          },
          walletB: {
            address: signerB.address, 
            provider: signerB.provider?.connection?.url || 'Connected'
          }
        }
      });
    } catch (error) {
      console.error('Wallet info error:', error);
      res.status(500).json({ 
        message: 'Failed to get wallet info',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test router integration
  app.get('/api/router/test', async (req, res) => {
    try {
      const chainId = parseInt(req.query.chainId as string) || 56;
      const chainConfig = getChainConfig(chainId);
      
      if (!chainConfig) {
        return res.status(400).json({ message: 'Unsupported chain ID' });
      }

      const isDevelopmentMode = process.env.NODE_ENV === 'development' && 
                               (!process.env.PRIVATE_KEY_A || !process.env.PRIVATE_KEY_B);
      
      res.json({
        chainId,
        chainName: chainConfig.name,
        routerAddress: chainConfig.routerAddress,
        mode: isDevelopmentMode ? 'development (simulation)' : 'production (real transactions)',
        supportedChains: getSupportedChains(),
        ready: true
      });
    } catch (error) {
      console.error('Router test error:', error);
      res.status(500).json({ 
        message: 'Failed to test router',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Initialize the app
  app.post('/api/init', async (req, res) => {
    try {
      // Initialize default wallets for all token pairs
      await storage.initializeWallets();

      // Create default settings for each token pair  
      const tokenPairs = ['btc_usdt', 'eth_usdt', 'cake_usdt', 'link_usdt', 'wbnb_usdt'];
      for (const pair of tokenPairs) {
        await storage.setSetting(`minProfitThreshold_${pair}`, '50');
        await storage.setSetting(`slippageTolerance_${pair}`, '0.5');
        await storage.setSetting(`maxPositionSize_${pair}`, '1000');
      }
      
      // Global settings
      await storage.setSetting('thresholdMode', 'fixed');
      await storage.setSetting('minProfitFixed', '50');
      await storage.setSetting('minProfitPercent', '5');
      await storage.setSetting('slippageTolerance', '0.5');
      await storage.setSetting('maxPositionSize', '1000');
      await storage.setSetting('autoExecute', 'true');
      await storage.setSetting('soundAlerts', 'false');
      
      // Auto execution settings
      await storage.setSetting('scannerIntervalSec', '5');
      await storage.setSetting('sessionDurationSec', '600');
      await storage.setSetting('autoExecMaxPerSession', '5');

      res.json({ success: true });
    } catch (error) {
      console.error('Initialization error:', error);
      res.status(500).json({ message: "Initialization failed" });
    }
  });



  // Helper function to extract quote symbol from trading pair
  function getQuoteSymbol(tokenPair: string): string {
    return tokenPair.split("_")[1].toUpperCase();
  }

  // Helper function to get base prices for different tokens
  function getBasePrice(tokenPair: string, dex: string): number {
    const basePrices = {
      'btc_usdt': { pancake: 43125.45, quickswap: 43212.77 },
      'eth_usdt': { pancake: 2456.78, quickswap: 2467.23 },
      'cake_usdt': { pancake: 4.23, quickswap: 4.28 },
      'link_usdt': { pancake: 13.45, quickswap: 13.52 },
      'wbnb_usdt': { pancake: 298.67, quickswap: 301.12 },
      // Support for additional quote tokens
      'btc_dai': { pancake: 43100.25, quickswap: 43185.50 },
      'eth_dai': { pancake: 2450.12, quickswap: 2461.85 },
      'btc_usdc': { pancake: 43110.75, quickswap: 43195.20 },
      'eth_usdc': { pancake: 2453.45, quickswap: 2464.90 },
    };
    
    return basePrices[tokenPair as keyof typeof basePrices]?.[dex as keyof typeof basePrices['btc_usdt']] || 100;
  }

  // Get PancakeSwap price
  app.get('/api/price/pancake', async (req, res) => {
    try {
      const tokenPair = (req.query.pair as string) || 'btc_usdt';
      const basePrice = getBasePrice(tokenPair, 'pancake');
      const variation = (Math.random() - 0.5) * (basePrice * 0.001); // 0.1% variation
      const price = basePrice + variation;

      const priceData = {
        dex: 'pancake',
        tokenPair,
        price: price.toFixed(8)
      };

      await storage.insertPrice(priceData);
      res.json({ price: price.toFixed(4), timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get PancakeSwap price' });
    }
  });

  // Get QuickSwap price
  app.get('/api/price/quickswap', async (req, res) => {
    try {
      const tokenPair = (req.query.pair as string) || 'btc_usdt';
      const basePrice = getBasePrice(tokenPair, 'quickswap');
      const variation = (Math.random() - 0.5) * (basePrice * 0.001); // 0.1% variation
      const price = basePrice + variation;

      const priceData = {
        dex: 'quickswap',
        tokenPair,
        price: price.toFixed(8)
      };

      await storage.insertPrice(priceData);
      res.json({ price: price.toFixed(4), timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get QuickSwap price' });
    }
  });

  // New scan all endpoints
  app.get("/api/scan/all", async (req, res) => {
    try {
      const tokenPairs = ['btc_usdt', 'eth_usdt', 'cake_usdt', 'link_usdt', 'wbnb_usdt'];
      const results = [];

      for (const pair of tokenPairs) {
        const pancakePrice = getBasePrice(pair, 'pancake');
        const quickswapPrice = getBasePrice(pair, 'quickswap');
        const quoteSymbol = getQuoteSymbol(pair);
        
        const spread = Math.abs(pancakePrice - quickswapPrice);
        const estimatedProfit = spread * 0.85; // Minus fees
        
        // Calculate minimum profit threshold based on mode
        const thresholdMode = await storage.getSetting('thresholdMode');
        const maxPositionSize = parseFloat((await storage.getSetting('maxPositionSize'))?.value || '1000');
        const minProfitFixed = parseFloat((await storage.getSetting('minProfitFixed'))?.value || '50');
        const minProfitPercent = parseFloat((await storage.getSetting('minProfitPercent'))?.value || '5');
        
        // Estimated gas fees (BNB Chain + Polygon)
        const estimatedGasFee = 0.85 + 0.05; // ~$0.90 total
        
        let rawThreshold = 0;
        if (thresholdMode?.value === "percent") {
          rawThreshold = (maxPositionSize * minProfitPercent) / 100;
        } else {
          rawThreshold = minProfitFixed;
        }
        
        const minProfit = rawThreshold + estimatedGasFee;
        
        results.push({
          pair,
          priceA: pancakePrice.toFixed(4),
          priceB: quickswapPrice.toFixed(4),
          spread: spread.toFixed(4),
          estimatedProfit: estimatedProfit.toFixed(4),
          profitable: estimatedProfit > minProfit,
          quoteSymbol,
          baseSymbol: pair.split("_")[0].toUpperCase(),
          timestamp: new Date().toISOString(),
        });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to scan markets" });
    }
  });

  app.get("/api/arbitrage/detail", async (req, res) => {
    try {
      const tokenPair = req.query.pair as string || 'btc_usdt';
      const quoteSymbol = getQuoteSymbol(tokenPair);
      const baseSymbol = tokenPair.split("_")[0].toUpperCase();
      
      const walletA = await storage.getWalletByDex('pancake', tokenPair);
      const walletB = await storage.getWalletByDex('quickswap', tokenPair);
      
      if (!walletA || !walletB) {
        return res.status(404).json({ message: "Wallets not found for pair" });
      }

      const pancakePrice = getBasePrice(tokenPair, 'pancake');
      const quickswapPrice = getBasePrice(tokenPair, 'quickswap');
      
      const spread = Math.abs(pancakePrice - quickswapPrice);
      const drift = pancakePrice - quickswapPrice;
      const estimatedProfit = spread * 0.85;
      
      // Calculate minimum profit threshold based on mode
      const thresholdMode = await storage.getSetting('thresholdMode');
      const maxPositionSize = parseFloat((await storage.getSetting('maxPositionSize'))?.value || '1000');
      const minProfitFixed = parseFloat((await storage.getSetting('minProfitFixed'))?.value || '50');
      const minProfitPercent = parseFloat((await storage.getSetting('minProfitPercent'))?.value || '5');
      
      // Estimated gas fees (BNB Chain + Polygon)
      const estimatedGasFee = 0.85 + 0.05; // ~$0.90 total
      
      let rawThreshold = 0;
      if (thresholdMode?.value === "percent") {
        rawThreshold = (maxPositionSize * minProfitPercent) / 100;
      } else {
        rawThreshold = minProfitFixed;
      }
      
      const minProfit = rawThreshold + estimatedGasFee;
      
      const detail = {
        pair: tokenPair,
        quoteSymbol,
        baseSymbol,
        walletA: {
          ...walletA,
          currentPrice: pancakePrice.toFixed(4),
          gasEstimate: "0.0023 BNB (~$0.85)",
        },
        walletB: {
          ...walletB,
          currentPrice: quickswapPrice.toFixed(4),
          gasEstimate: "0.12 MATIC (~$0.05)",
        },
        spread: spread.toFixed(4),
        drift: drift.toFixed(4),
        estimatedProfit: estimatedProfit.toFixed(4),
        profitable: estimatedProfit > minProfit,
        timestamp: new Date().toISOString(),
      };

      res.json(detail);
    } catch (error) {
      res.status(500).json({ message: "Failed to get arbitrage detail" });
    }
  });

  // Get arbitrage status
  app.get('/api/arbitrage/status', async (req, res) => {
    try {
      const tokenPair = (req.query.pair as string) || 'btc_usdt';
      const pancakePrices = await storage.getPricesByDex('pancake', tokenPair);
      const quickswapPrices = await storage.getPricesByDex('quickswap', tokenPair);

      if (pancakePrices.length === 0 || quickswapPrices.length === 0) {
        return res.json({
          spread: "0.00",
          drift: "0.00",
          estimatedProfit: "0.00",
          profitable: false,
          priceA: "0.00",
          priceB: "0.00"
        });
      }

      const priceA = parseFloat(pancakePrices[0].price);
      const priceB = parseFloat(quickswapPrices[0].price);
      const spread = priceB - priceA;
      const drift = pancakePrices.length > 1 ? priceA - parseFloat(pancakePrices[1].price) : 0;
      
      // Calculate estimated profit (1 unit trade, minus fees)
      const baseToken = tokenPair.split("_")[0];
      const quoteSymbol = getQuoteSymbol(tokenPair);
      const tradingUnit = baseToken === 'btc' ? 1 : baseToken === 'eth' ? 10 : 100;
      const feeEstimate = priceA * 0.001; // 0.1% fee estimate
      const estimatedProfit = Math.max(0, (spread * tradingUnit) - feeEstimate);
      
      // Calculate minimum profit threshold based on mode
      const thresholdMode = await storage.getSetting('thresholdMode');
      const maxPositionSizeSetting = await storage.getSetting('maxPositionSize');
      const maxPositionSize = parseFloat(maxPositionSizeSetting?.value || '1000');
      const minProfitFixed = parseFloat((await storage.getSetting('minProfitFixed'))?.value || '50');
      const minProfitPercent = parseFloat((await storage.getSetting('minProfitPercent'))?.value || '5');
      
      // Estimated gas fees (BNB Chain + Polygon)
      const estimatedGasFee = 0.85 + 0.05; // ~$0.90 total
      
      let rawThreshold = 0;
      if (thresholdMode?.value === "percent") {
        rawThreshold = (maxPositionSize * minProfitPercent) / 100;
      } else {
        rawThreshold = minProfitFixed;
      }
      
      const minProfit = rawThreshold + estimatedGasFee;
      const profitable = estimatedProfit > minProfit;

      const status = {
        spread: spread.toFixed(4),
        drift: drift.toFixed(4),
        estimatedProfit: estimatedProfit.toFixed(2),
        profitable,
        priceA: priceA.toFixed(4),
        priceB: priceB.toFixed(4),
        quoteSymbol,
        baseSymbol: baseToken.toUpperCase()
      };

      // Broadcast to WebSocket clients
      broadcast({ type: 'arbitrage_status', data: { ...status, tokenPair } });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get arbitrage status' });
    }
  });

  // Execute arbitrage
  app.post('/api/arbitrage/execute', async (req, res) => {
    try {
      const { tokenPair = 'btc_usdt', executionType = 'manual' } = req.body;
      const quoteSymbol = getQuoteSymbol(tokenPair);
      const baseToken = tokenPair.split("_")[0];
      const pancakePrices = await storage.getPricesByDex('pancake', tokenPair);
      const quickswapPrices = await storage.getPricesByDex('quickswap', tokenPair);

      if (pancakePrices.length === 0 || quickswapPrices.length === 0) {
        return res.status(400).json({ message: 'No price data available' });
      }

      const priceA = parseFloat(pancakePrices[0].price);
      const priceB = parseFloat(quickswapPrices[0].price);
      const spread = priceB - priceA;
      
      const tradingUnit = baseToken === 'btc' ? 1 : baseToken === 'eth' ? 10 : 100;
      const feeEstimate = priceA * 0.001;
      const estimatedProfit = Math.max(0, (spread * tradingUnit) - feeEstimate);

      // Calculate minimum profit threshold based on mode
      const thresholdMode = await storage.getSetting('thresholdMode');
      const maxPositionSizeSetting = await storage.getSetting('maxPositionSize');
      const maxPositionSize = parseFloat(maxPositionSizeSetting?.value || '1000');
      const minProfitFixed = parseFloat((await storage.getSetting('minProfitFixed'))?.value || '50');
      const minProfitPercent = parseFloat((await storage.getSetting('minProfitPercent'))?.value || '5');
      
      // Estimated gas fees (BNB Chain + Polygon)
      const estimatedGasFee = 0.85 + 0.05; // ~$0.90 total
      
      let rawThreshold = 0;
      if (thresholdMode?.value === "percent") {
        rawThreshold = (maxPositionSize * minProfitPercent) / 100;
      } else {
        rawThreshold = minProfitFixed;
      }
      
      const minProfit = rawThreshold + estimatedGasFee;
      
      if (estimatedProfit < minProfit) {
        return res.status(400).json({ 
          message: `Profit below minimum threshold (${minProfit.toFixed(2)} ${quoteSymbol})` 
        });
      }

      // Execute real swap transactions on both chains
      
      // Get chain configurations
      const bscConfig = getChainConfig(56); // BSC
      const polygonConfig = getChainConfig(137); // Polygon
      
      if (!bscConfig || !polygonConfig) {
        return res.status(500).json({ message: "Unsupported chain configuration" });
      }

      // Prepare swap parameters for both wallets
      const swapAmountIn = BigInt(Math.floor(tradingUnit * 1e18)); // Convert to wei
      
      const swapParamsA: SwapParams = {
        signer: signerA,
        routerAddress: bscConfig.routerAddress,
        tokenIn: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
        tokenOut: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB on BSC
        amountIn: swapAmountIn,
        slippage: 0.5,
        chainId: 56
      };
      
      const swapParamsB: SwapParams = {
        signer: signerB,
        routerAddress: polygonConfig.routerAddress,
        tokenIn: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC on Polygon
        tokenOut: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT on Polygon
        amountIn: swapAmountIn,
        slippage: 0.5,
        chainId: 137
      };

      // Execute swaps simultaneously on both chains
      const [resultA, resultB] = await Promise.all([
        executeSwap(swapParamsA),
        executeSwap(swapParamsB)
      ]);
      
      const txA = {
        status: resultA.status,
        network: "bsc",
        hash: resultA.txHash
      };
      
      const txB = {
        status: resultB.status,
        network: "polygon", 
        hash: resultB.txHash
      };
      
      // Check if both transactions succeeded
      if (resultA.status === "failed" || resultB.status === "failed") {
        return res.status(500).json({ 
          message: "Failed to execute arbitrage",
          txA,
          txB,
          totalProfit: 0,
          errors: {
            walletA: resultA.error,
            walletB: resultB.error
          }
        });
      }

      // Log the successful arbitrage execution
      const logData = {
        tokenPair,
        priceA: priceA.toFixed(8),
        priceB: priceB.toFixed(8),
        spread: spread.toFixed(8),
        estimatedProfit: estimatedProfit.toFixed(8),
        executed: true,
        executionType,
        walletA: 'PancakeSwap',
        walletB: 'QuickSwap',
        buyPrice: priceA.toFixed(8),
        sellPrice: priceB.toFixed(8),
        profit: estimatedProfit.toFixed(8),
        txHash: `${resultA.txHash}, ${resultB.txHash}`
      };

      const log = await storage.insertArbitrageLog(logData);
      
      // Update wallet balances after successful execution
      const walletA = await storage.getWalletByDex('pancake', tokenPair);
      const walletB = await storage.getWalletByDex('quickswap', tokenPair);
      
      if (walletA && walletB) {
        // Buy on wallet A (spend quote token, get base token)
        const newBaseBalanceA = parseFloat(walletA.baseBalance) + tradingUnit;
        const newQuoteBalanceA = parseFloat(walletA.quoteBalance) - (priceA * tradingUnit);
        
        // Sell on wallet B (spend base token, get quote token)
        const newBaseBalanceB = parseFloat(walletB.baseBalance) - tradingUnit;
        const newQuoteBalanceB = parseFloat(walletB.quoteBalance) + (priceB * tradingUnit);
        
        await storage.updateWalletBalances(walletA.id, newBaseBalanceA.toFixed(8), newQuoteBalanceA.toFixed(2));
        await storage.updateWalletBalances(walletB.id, newBaseBalanceB.toFixed(8), newQuoteBalanceB.toFixed(2));
      }
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'arbitrage_executed', data: { ...log, tokenPair } });

      // Return the exact JSON structure requested
      res.json({ 
        txA,
        txB,
        totalProfit: parseFloat(estimatedProfit.toFixed(2))
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to execute arbitrage' });
    }
  });

  // Get arbitrage history
  app.get('/api/arbitrage/history', async (req, res) => {
    try {
      const tokenPair = (req.query.pair as string) || 'btc_usdt';
      const history = await storage.getArbitrageHistory(tokenPair, 20);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get arbitrage history' });
    }
  });

  // Get settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get settings' });
    }
  });

  // Update settings
  app.post('/api/settings', async (req, res) => {
    try {
      const settingsData = req.body;
      const updatedSettings = [];

      for (const [key, value] of Object.entries(settingsData)) {
        const setting = await storage.setSetting(key, String(value));
        updatedSettings.push(setting);
      }

      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Get wallet balances
  app.get('/api/wallets', async (req, res) => {
    try {
      const tokenPair = req.query.pair as string;
      const wallets = await storage.getWallets(tokenPair);
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get wallets' });
    }
  });

  // Price update loop (simulated)
  setInterval(async () => {
    try {
      const tokenPairs = ['btc_usdt', 'eth_usdt', 'cake_usdt', 'link_usdt', 'wbnb_usdt'];
      
      for (const tokenPair of tokenPairs) {
        const pancakeBasePrice = getBasePrice(tokenPair, 'pancake');
        const quickswapBasePrice = getBasePrice(tokenPair, 'quickswap');
        
        const pancakeVariation = (Math.random() - 0.5) * (pancakeBasePrice * 0.001);
        const quickswapVariation = (Math.random() - 0.5) * (quickswapBasePrice * 0.001);
        
        const pancakePrice = pancakeBasePrice + pancakeVariation;
        const quickswapPrice = quickswapBasePrice + quickswapVariation;

        await storage.insertPrice({
          dex: 'pancake',
          tokenPair,
          price: pancakePrice.toFixed(8)
        });

        await storage.insertPrice({
          dex: 'quickswap',
          tokenPair,
          price: quickswapPrice.toFixed(8)
        });
      }

      // Broadcast price updates for current active pair (could be enhanced to track active pair)
      const activePair = 'btc_usdt'; // Default active pair
      const latestPancake = await storage.getPricesByDex('pancake', activePair);
      const latestQuickswap = await storage.getPricesByDex('quickswap', activePair);
      
      if (latestPancake.length > 0 && latestQuickswap.length > 0) {
        broadcast({
          type: 'price_update',
          data: {
            tokenPair: activePair,
            pancake: parseFloat(latestPancake[0].price).toFixed(4),
            quickswap: parseFloat(latestQuickswap[0].price).toFixed(4)
          }
        });
      }
    } catch (error) {
      console.error('Price update error:', error);
    }
  }, 5000); // Update every 5 seconds

  // CSV Export endpoint
  app.get("/api/arbitrage/export/csv", async (req, res) => {
    try {
      const logs = await storage.getArbitrageHistory('', 1000); // Get all logs, limit 1000
      
      const header = [
        "ID",
        "Token Pair",
        "Execution Type",
        "Buy Price",
        "Sell Price",
        "Profit",
        "Wallet A", 
        "Wallet B",
        "TX Hash",
        "Timestamp"
      ];

      const rows = logs.map(log => [
        log.id,
        log.tokenPair.toUpperCase(),
        log.executionType || 'manual',
        log.buyPrice || log.priceA,
        log.sellPrice || log.priceB,
        log.profit || log.estimatedProfit,
        log.walletA || 'PancakeSwap',
        log.walletB || 'QuickSwap',
        log.txHash || '',
        format(new Date(log.executedAt), "yyyy-MM-dd HH:mm:ss")
      ]);

      const csv = [header, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=arbitrage_log.csv");
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export CSV' });
    }
  });

  // JSON Export endpoint
  app.get("/api/arbitrage/export/json", async (req, res) => {
    try {
      const logs = await storage.getArbitrageHistory('', 1000); // Get all logs, limit 1000
      
      const exportData = logs.map(log => ({
        id: log.id,
        tokenPair: log.tokenPair,
        executionType: log.executionType || 'manual',
        buyPrice: log.buyPrice || log.priceA,
        sellPrice: log.sellPrice || log.priceB,
        profit: log.profit || log.estimatedProfit,
        walletA: log.walletA || 'PancakeSwap',
        walletB: log.walletB || 'QuickSwap',
        txHash: log.txHash || '',
        timestamp: log.executedAt,
        formattedTimestamp: format(new Date(log.executedAt), "yyyy-MM-dd HH:mm:ss")
      }));

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=arbitrage_log.json");
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export JSON' });
    }
  });

  return httpServer;
}
