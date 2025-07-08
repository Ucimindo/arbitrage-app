import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPriceSchema, insertArbitrageLogSchema, insertSettingSchema } from "@shared/schema";
import { z } from "zod";

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

  // Initialize default wallets and settings
  app.post('/api/init', async (req, res) => {
    try {
      // Create default wallets for all token pairs
      await storage.initializeWallets();

      // Create default settings for each token pair
      const tokenPairs = ['btc_usdt', 'eth_usdt', 'cake_usdt', 'link_usdt', 'wbnb_usdt'];
      for (const pair of tokenPairs) {
        await storage.setSetting(`minProfitThreshold_${pair}`, '50');
        await storage.setSetting(`slippageTolerance_${pair}`, '0.5');
        await storage.setSetting(`maxPositionSize_${pair}`, '1000');
      }
      
      await storage.setSetting('autoExecute', 'true');
      await storage.setSetting('soundAlerts', 'false');

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to initialize' });
    }
  });

  // Helper function to get base prices for different tokens
  function getBasePrice(tokenPair: string, dex: string): number {
    const basePrices = {
      'btc_usdt': { pancake: 43125.45, quickswap: 43212.77 },
      'eth_usdt': { pancake: 2456.78, quickswap: 2467.23 },
      'cake_usdt': { pancake: 4.23, quickswap: 4.28 },
      'link_usdt': { pancake: 13.45, quickswap: 13.52 },
      'wbnb_usdt': { pancake: 298.67, quickswap: 301.12 },
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
        
        const spread = Math.abs(pancakePrice - quickswapPrice);
        const estimatedProfit = spread * 0.85; // Minus fees
        
        results.push({
          pair,
          priceA: pancakePrice.toFixed(4),
          priceB: quickswapPrice.toFixed(4),
          spread: spread.toFixed(4),
          estimatedProfit: estimatedProfit.toFixed(4),
          profitable: estimatedProfit > 50,
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
      
      const detail = {
        pair: tokenPair,
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
        profitable: estimatedProfit > 50,
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
      const tradingUnit = tokenPair === 'btc_usdt' ? 1 : tokenPair === 'eth_usdt' ? 10 : 100;
      const feeEstimate = priceA * 0.001; // 0.1% fee estimate
      const estimatedProfit = Math.max(0, (spread * tradingUnit) - feeEstimate);
      
      const minProfitSetting = await storage.getSetting(`minProfitThreshold_${tokenPair}`);
      const minProfit = parseFloat(minProfitSetting?.value || '10');
      const profitable = estimatedProfit > minProfit;

      const status = {
        spread: spread.toFixed(4),
        drift: drift.toFixed(4),
        estimatedProfit: estimatedProfit.toFixed(2),
        profitable,
        priceA: priceA.toFixed(4),
        priceB: priceB.toFixed(4)
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
      const { tokenPair = 'btc_usdt' } = req.body;
      const pancakePrices = await storage.getPricesByDex('pancake', tokenPair);
      const quickswapPrices = await storage.getPricesByDex('quickswap', tokenPair);

      if (pancakePrices.length === 0 || quickswapPrices.length === 0) {
        return res.status(400).json({ message: 'No price data available' });
      }

      const priceA = parseFloat(pancakePrices[0].price);
      const priceB = parseFloat(quickswapPrices[0].price);
      const spread = priceB - priceA;
      
      const tradingUnit = tokenPair === 'btc_usdt' ? 1 : tokenPair === 'eth_usdt' ? 10 : 100;
      const feeEstimate = priceA * 0.001;
      const estimatedProfit = Math.max(0, (spread * tradingUnit) - feeEstimate);

      const minProfitSetting = await storage.getSetting(`minProfitThreshold_${tokenPair}`);
      const minProfit = parseFloat(minProfitSetting?.value || '10');
      
      if (estimatedProfit < minProfit) {
        return res.status(400).json({ message: 'Profit below minimum threshold' });
      }

      const logData = {
        tokenPair,
        priceA: priceA.toFixed(8),
        priceB: priceB.toFixed(8),
        spread: spread.toFixed(8),
        estimatedProfit: estimatedProfit.toFixed(8),
        executed: true
      };

      // Generate transaction IDs for simulation
      const txA = `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`;
      const txB = `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`;

      const log = await storage.insertArbitrageLog(logData);
      
      // Simulate wallet balance updates
      const walletA = await storage.getWalletByDex('pancake', tokenPair);
      const walletB = await storage.getWalletByDex('quickswap', tokenPair);
      
      if (walletA && walletB) {
        // Buy on wallet A (spend USDT, get base token)
        const newBaseBalanceA = parseFloat(walletA.baseBalance) + tradingUnit;
        const newQuoteBalanceA = parseFloat(walletA.quoteBalance) - (priceA * tradingUnit);
        
        // Sell on wallet B (spend base token, get USDT)
        const newBaseBalanceB = parseFloat(walletB.baseBalance) - tradingUnit;
        const newQuoteBalanceB = parseFloat(walletB.quoteBalance) + (priceB * tradingUnit);
        
        await storage.updateWalletBalances(walletA.id, newBaseBalanceA.toFixed(8), newQuoteBalanceA.toFixed(2));
        await storage.updateWalletBalances(walletB.id, newBaseBalanceB.toFixed(8), newQuoteBalanceB.toFixed(2));
      }
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'arbitrage_executed', data: { ...log, tokenPair } });

      res.json({ 
        success: true, 
        totalProfit: estimatedProfit.toFixed(2),
        txA,
        txB
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

  return httpServer;
}
