import { 
  prices, 
  arbitrageLog, 
  wallets, 
  settings,
  users,
  type Price,
  type InsertPrice,
  type ArbitrageLog,
  type InsertArbitrageLog,
  type Wallet,
  type InsertWallet,
  type Setting,
  type InsertSetting,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods (keeping for compatibility)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Price methods
  insertPrice(price: InsertPrice): Promise<Price>;
  getLatestPrices(tokenPair?: string): Promise<Price[]>;
  getPricesByDex(dex: string, tokenPair: string): Promise<Price[]>;
  
  // Arbitrage methods
  insertArbitrageLog(log: InsertArbitrageLog): Promise<ArbitrageLog>;
  getArbitrageHistory(tokenPair: string, limit?: number): Promise<ArbitrageLog[]>;
  
  // Wallet methods
  getWallets(tokenPair?: string): Promise<Wallet[]>;
  getWalletByDex(dex: string, tokenPair: string): Promise<Wallet | undefined>;
  updateWalletBalances(id: number, baseBalance: string, quoteBalance: string): Promise<Wallet>;
  initializeWallets(): Promise<void>;
  
  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async insertPrice(price: InsertPrice): Promise<Price> {
    const [result] = await db.insert(prices).values(price).returning();
    return result;
  }

  async getLatestPrices(tokenPair?: string): Promise<Price[]> {
    if (tokenPair) {
      return await db
        .select()
        .from(prices)
        .where(eq(prices.tokenPair, tokenPair))
        .orderBy(desc(prices.timestamp))
        .limit(10);
    }
    
    return await db
      .select()
      .from(prices)
      .orderBy(desc(prices.timestamp))
      .limit(10);
  }

  async getPricesByDex(dex: string, tokenPair: string): Promise<Price[]> {
    return await db
      .select()
      .from(prices)
      .where(and(eq(prices.dex, dex), eq(prices.tokenPair, tokenPair)))
      .orderBy(desc(prices.timestamp))
      .limit(5);
  }

  async insertArbitrageLog(log: InsertArbitrageLog): Promise<ArbitrageLog> {
    const [result] = await db.insert(arbitrageLog).values(log).returning();
    return result;
  }

  async getArbitrageHistory(tokenPair: string, limit = 20): Promise<ArbitrageLog[]> {
    return await db
      .select()
      .from(arbitrageLog)
      .where(eq(arbitrageLog.tokenPair, tokenPair))
      .orderBy(desc(arbitrageLog.executedAt))
      .limit(limit);
  }

  async getWallets(tokenPair?: string): Promise<Wallet[]> {
    if (tokenPair) {
      return await db
        .select()
        .from(wallets)
        .where(eq(wallets.tokenPair, tokenPair));
    }
    
    return await db.select().from(wallets);
  }

  async getWalletByDex(dex: string, tokenPair: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.dex, dex), eq(wallets.tokenPair, tokenPair)));
    return wallet || undefined;
  }

  async updateWalletBalances(id: number, baseBalance: string, quoteBalance: string): Promise<Wallet> {
    const [wallet] = await db
      .update(wallets)
      .set({ 
        baseBalance, 
        quoteBalance, 
        lastUpdated: new Date() 
      })
      .where(eq(wallets.id, id))
      .returning();
    return wallet;
  }

  async initializeWallets(): Promise<void> {
    const tokenPairs = ['btc_usdt', 'eth_usdt', 'cake_usdt', 'link_usdt', 'wbnb_usdt'];
    
    for (const tokenPair of tokenPairs) {
      // Check if wallets already exist for this pair
      const existingWallets = await this.getWallets(tokenPair);
      
      if (existingWallets.length === 0) {
        // Create PancakeSwap wallet
        await db.insert(wallets).values({
          name: `Wallet A - PancakeSwap`,
          chain: 'bnb',
          dex: 'pancake',
          tokenPair,
          baseBalance: this.getRandomBalance(tokenPair),
          quoteBalance: (Math.random() * 3000 + 1000).toFixed(8), // Random USDT balance
        });

        // Create QuickSwap wallet  
        await db.insert(wallets).values({
          name: `Wallet B - QuickSwap`,
          chain: 'polygon',
          dex: 'quickswap',
          tokenPair,
          baseBalance: this.getRandomBalance(tokenPair),
          quoteBalance: (Math.random() * 3000 + 1000).toFixed(8), // Random USDT balance
        });
      }
    }
  }

  private getRandomBalance(tokenPair: string): string {
    const baseBalances = {
      'btc_usdt': (Math.random() * 0.1 + 0.01).toFixed(8),
      'eth_usdt': (Math.random() * 2 + 0.1).toFixed(8),
      'cake_usdt': (Math.random() * 100 + 10).toFixed(8),
      'link_usdt': (Math.random() * 50 + 5).toFixed(8),
      'wbnb_usdt': (Math.random() * 10 + 1).toFixed(8),
    };
    return baseBalances[tokenPair as keyof typeof baseBalances] || '0';
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value }
      })
      .returning();
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }
}

export const storage = new DatabaseStorage();
