import { pgTable, text, serial, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Prices table for tracking DEX prices
export const prices = pgTable("prices", {
  id: serial("id").primaryKey(),
  dex: text("dex").notNull(), // 'pancake' or 'quickswap'
  tokenPair: text("token_pair").notNull(), // 'btc_usdt', 'eth_usdt', etc.
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// Arbitrage log for tracking executions
export const arbitrageLog = pgTable("arbitrage_log", {
  id: serial("id").primaryKey(),
  tokenPair: text("token_pair").notNull(), // 'btc_usdt', 'eth_usdt', etc.
  priceA: numeric("price_a", { precision: 18, scale: 8 }).notNull(),
  priceB: numeric("price_b", { precision: 18, scale: 8 }).notNull(),
  spread: numeric("spread", { precision: 18, scale: 8 }).notNull(),
  estimatedProfit: numeric("estimated_profit", { precision: 18, scale: 8 }).notNull(),
  executed: boolean("executed").default(false).notNull(),
  executionType: text("execution_type").default("manual").notNull(), // 'auto' or 'manual'
  walletA: text("wallet_a").default('PancakeSwap'), // 'PancakeSwap'
  walletB: text("wallet_b").default('QuickSwap'), // 'QuickSwap'
  buyPrice: numeric("buy_price", { precision: 18, scale: 8 }).default('0'),
  sellPrice: numeric("sell_price", { precision: 18, scale: 8 }).default('0'),
  profit: numeric("profit", { precision: 18, scale: 8 }).default('0'),
  txHash: text("tx_hash").default(''), // simulated transaction hash
  executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
});

// Wallets table for balance tracking
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  chain: text("chain").notNull(), // 'bnb' or 'polygon'
  dex: text("dex").notNull(), // 'pancake' or 'quickswap'
  tokenPair: text("token_pair").notNull(), // 'btc_usdt', 'eth_usdt', etc.
  baseBalance: numeric("base_balance", { precision: 18, scale: 8 }).notNull(), // BTC, ETH, CAKE, etc.
  quoteBalance: numeric("quote_balance", { precision: 18, scale: 8 }).notNull(), // USDT
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
});

// Settings table for configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Insert schemas
export const insertPriceSchema = createInsertSchema(prices).omit({ id: true, timestamp: true });
export const insertArbitrageLogSchema = createInsertSchema(arbitrageLog).omit({ id: true, executedAt: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, lastUpdated: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });

// Types
export type Price = typeof prices.$inferSelect;
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type ArbitrageLog = typeof arbitrageLog.$inferSelect;
export type InsertArbitrageLog = z.infer<typeof insertArbitrageLogSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Session storage table for express-session
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
