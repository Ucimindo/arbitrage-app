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
      // Create default wallets
      const wallets = await storage.getWallets();
      if (wallets.length === 0) {
        await storage.updateWalletBalances(1, '2450.67', '0.0523'); // PancakeSwap
        await storage.updateWalletBalances(2, '1823.92', '0.0847'); // QuickSwap
      }

      // Create default settings
      await storage.setSetting('minProfitThreshold', '50');
      await storage.setSetting('slippageTolerance', '0.5');
      await storage.setSetting('maxPositionSize', '1000');
      await storage.setSetting('autoExecute', 'true');
      await storage.setSetting('soundAlerts', 'false');

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to initialize' });
    }
  });

  // Get PancakeSwap price
  app.get('/api/price/pancake', async (req, res) => {
    try {
      // Generate mock price data
      const basePrice = 43125.45;
      const variation = (Math.random() - 0.5) * 20;
      const price = basePrice + variation;

      const priceData = {
        dex: 'pancake',
        tokenPair: 'BTC/USDT',
        price: price.toFixed(8)
      };

      await storage.insertPrice(priceData);
      res.json({ price: price.toFixed(2), timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get PancakeSwap price' });
    }
  });

  // Get QuickSwap price
  app.get('/api/price/quickswap', async (req, res) => {
    try {
      // Generate mock price data (slightly higher for arbitrage opportunity)
      const basePrice = 43212.77;
      const variation = (Math.random() - 0.5) * 20;
      const price = basePrice + variation;

      const priceData = {
        dex: 'quickswap',
        tokenPair: 'BTC/USDT',
        price: price.toFixed(8)
      };

      await storage.insertPrice(priceData);
      res.json({ price: price.toFixed(2), timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get QuickSwap price' });
    }
  });

  // Get arbitrage status
  app.get('/api/arbitrage/status', async (req, res) => {
    try {
      const pancakePrices = await storage.getPricesByDex('pancake');
      const quickswapPrices = await storage.getPricesByDex('quickswap');

      if (pancakePrices.length === 0 || quickswapPrices.length === 0) {
        return res.json({
          spread: 0,
          drift: 0,
          estimatedProfit: 0,
          profitable: false,
          priceA: 0,
          priceB: 0
        });
      }

      const priceA = parseFloat(pancakePrices[0].price);
      const priceB = parseFloat(quickswapPrices[0].price);
      const spread = priceB - priceA;
      const drift = pancakePrices.length > 1 ? priceA - parseFloat(pancakePrices[1].price) : 0;
      
      // Calculate estimated profit (assuming 1 BTC trade, minus fees)
      const estimatedProfit = Math.max(0, spread - 4); // Rough fee estimate
      const profitable = estimatedProfit > 50; // Configurable threshold

      const status = {
        spread: spread.toFixed(2),
        drift: drift.toFixed(2),
        estimatedProfit: estimatedProfit.toFixed(2),
        profitable,
        priceA: priceA.toFixed(2),
        priceB: priceB.toFixed(2)
      };

      // Broadcast to WebSocket clients
      broadcast({ type: 'arbitrage_status', data: status });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get arbitrage status' });
    }
  });

  // Execute arbitrage
  app.post('/api/arbitrage/execute', async (req, res) => {
    try {
      const pancakePrices = await storage.getPricesByDex('pancake');
      const quickswapPrices = await storage.getPricesByDex('quickswap');

      if (pancakePrices.length === 0 || quickswapPrices.length === 0) {
        return res.status(400).json({ message: 'No price data available' });
      }

      const priceA = parseFloat(pancakePrices[0].price);
      const priceB = parseFloat(quickswapPrices[0].price);
      const spread = priceB - priceA;
      const estimatedProfit = Math.max(0, spread - 4);

      const minProfit = parseFloat((await storage.getSetting('minProfitThreshold'))?.value || '50');
      
      if (estimatedProfit < minProfit) {
        return res.status(400).json({ message: 'Profit below minimum threshold' });
      }

      const logData = {
        pair: 'BTC/USDT',
        priceA: priceA.toFixed(8),
        priceB: priceB.toFixed(8),
        spread: spread.toFixed(8),
        estimatedProfit: estimatedProfit.toFixed(8),
        executed: true
      };

      const log = await storage.insertArbitrageLog(logData);
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'arbitrage_executed', data: log });

      res.json({ success: true, profit: estimatedProfit.toFixed(2) });
    } catch (error) {
      res.status(500).json({ message: 'Failed to execute arbitrage' });
    }
  });

  // Get arbitrage history
  app.get('/api/arbitrage/history', async (req, res) => {
    try {
      const history = await storage.getArbitrageHistory(20);
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
      const wallets = await storage.getWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get wallets' });
    }
  });

  // Price update loop (simulated)
  setInterval(async () => {
    try {
      // Generate and broadcast new prices
      const pancakePrice = 43125.45 + (Math.random() - 0.5) * 20;
      const quickswapPrice = 43212.77 + (Math.random() - 0.5) * 20;

      await storage.insertPrice({
        dex: 'pancake',
        tokenPair: 'BTC/USDT',
        price: pancakePrice.toFixed(8)
      });

      await storage.insertPrice({
        dex: 'quickswap',
        tokenPair: 'BTC/USDT',
        price: quickswapPrice.toFixed(8)
      });

      // Broadcast price updates
      broadcast({
        type: 'price_update',
        data: {
          pancake: pancakePrice.toFixed(2),
          quickswap: quickswapPrice.toFixed(2)
        }
      });
    } catch (error) {
      console.error('Price update error:', error);
    }
  }, 5000); // Update every 5 seconds

  return httpServer;
}
