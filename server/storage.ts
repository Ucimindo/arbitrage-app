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
  getLatestPrices(): Promise<Price[]>;
  getPricesByDex(dex: string): Promise<Price[]>;
  
  // Arbitrage methods
  insertArbitrageLog(log: InsertArbitrageLog): Promise<ArbitrageLog>;
  getArbitrageHistory(limit?: number): Promise<ArbitrageLog[]>;
  
  // Wallet methods
  getWallets(): Promise<Wallet[]>;
  getWalletByDex(dex: string): Promise<Wallet | undefined>;
  updateWalletBalances(id: number, usdtBalance: string, btcBalance: string): Promise<Wallet>;
  
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

  async getLatestPrices(): Promise<Price[]> {
    return await db
      .select()
      .from(prices)
      .orderBy(desc(prices.timestamp))
      .limit(10);
  }

  async getPricesByDex(dex: string): Promise<Price[]> {
    return await db
      .select()
      .from(prices)
      .where(eq(prices.dex, dex))
      .orderBy(desc(prices.timestamp))
      .limit(5);
  }

  async insertArbitrageLog(log: InsertArbitrageLog): Promise<ArbitrageLog> {
    const [result] = await db.insert(arbitrageLog).values(log).returning();
    return result;
  }

  async getArbitrageHistory(limit = 20): Promise<ArbitrageLog[]> {
    return await db
      .select()
      .from(arbitrageLog)
      .orderBy(desc(arbitrageLog.executedAt))
      .limit(limit);
  }

  async getWallets(): Promise<Wallet[]> {
    return await db.select().from(wallets);
  }

  async getWalletByDex(dex: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.dex, dex));
    return wallet || undefined;
  }

  async updateWalletBalances(id: number, usdtBalance: string, btcBalance: string): Promise<Wallet> {
    const [wallet] = await db
      .update(wallets)
      .set({ 
        usdtBalance, 
        btcBalance, 
        lastUpdated: new Date() 
      })
      .where(eq(wallets.id, id))
      .returning();
    return wallet;
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
