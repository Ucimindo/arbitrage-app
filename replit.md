# Dual Wallet Arbitrage Monitoring App

## Overview

This is a fullstack crypto arbitrage monitoring application built with React 18, Express.js, and PostgreSQL. The app monitors price differences between PancakeSwap (BNB Chain) and QuickSwap (Polygon) for BTC/USDT trading pairs and provides real-time arbitrage opportunities with automated execution capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: TailwindCSS with dark mode support and CSS variables
- **UI Components**: shadcn/ui components built on Radix UI primitives
- **HTTP Client**: Axios for API requests
- **Real-time Updates**: WebSocket connection for live price feeds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket server for broadcasting price updates
- **API Structure**: RESTful endpoints with WebSocket support
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reloading with Vite integration

### Database Schema
The application uses four main tables:
- **prices**: Stores DEX price data with timestamps
- **arbitrage_log**: Records arbitrage opportunities and executions
- **wallets**: Tracks wallet balances for both chains
- **settings**: Stores user configuration preferences

## Key Components

### Real-time Price Monitoring
- WebSocket connection for live price updates from both DEXs
- Price drift calculation and spread monitoring
- Automated refresh mechanisms with manual override

### Dual Wallet Management
- **Wallet A**: PancakeSwap on BNB Chain (USDT/BTCB balances)
- **Wallet B**: QuickSwap on Polygon (USDT/WBTC balances)
- Real-time balance tracking and gas estimation

### Arbitrage Engine
- Continuous spread calculation between DEXs
- Profitability analysis with customizable thresholds
- Execution logging and transaction history
- Risk management with slippage controls

### User Interface
- **Dashboard**: Split-panel layout showing both wallets
- **Status Panel**: Real-time arbitrage opportunities
- **Transaction Log**: Historical execution records
- **Settings**: Configurable thresholds and preferences

## Data Flow

1. **Price Data Collection**: Backend simulates price feeds from both DEXs
2. **WebSocket Broadcasting**: Real-time price updates sent to connected clients
3. **Arbitrage Calculation**: Frontend calculates spread and profitability
4. **Execution Decision**: Manual or automated execution based on settings
5. **Database Logging**: All transactions and price data stored for analysis

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **ws**: WebSocket server implementation

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type safety across the stack
- **TailwindCSS**: Utility-first CSS framework
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- Express server with TypeScript compilation
- PostgreSQL database with Drizzle migrations
- WebSocket server for real-time updates

### Production Build
- Frontend: Vite build output to `dist/public`
- Backend: ESBuild compilation to `dist/index.js`
- Database: Drizzle migrations applied via `db:push`
- Static file serving through Express

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Environment mode (development/production)
- WebSocket and HTTP servers run on the same port

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **July 08, 2025**: Initial setup with multi-token pair support
- **July 08, 2025**: Implemented manual price scan mode replacing automatic polling
  - Added scanner grid with "Scan Opportunities" button
  - Created arbitrage detail panel for selected pairs
  - Removed automatic price updates and WebSocket polling
  - Added wallet-local transaction execution without cross-chain transfers
  - Enhanced backend with `/api/scan/all` and `/api/arbitrage/detail` endpoints
- **July 08, 2025**: Refactored currency display system
  - Replaced hardcoded "$" symbols with dynamic quote token suffixes
  - Added token-aware display logic: btc_usdt → "USDT", eth_usdt → "USDT"
  - Enhanced scanner grid and detail panel with quote symbol extraction
  - Future-proofed for additional quote tokens (BUSD, DAI, etc.)
- **July 08, 2025**: Unified settings into modal interface
  - Converted inline SettingsPanel to modal dialog accessible from navbar
  - Added comprehensive trading settings: profit thresholds, slippage, automation
  - Improved UX with single settings access point via ⚙️ button
  - Removed redundant settings card from dashboard layout

## Manual Scan Mode Features

### Scanner Grid
- **Toggleable Scanner Mode**: Start/Stop scanner with 5-second interval scanning
- **Real-time Status**: Shows "Running..." or "Stopped" with last scan timestamp
- **Smart Highlighting**: Best spread marked with star ⭐, most profitable marked with fire 🔥
- **Improved Readability**: Clean border-based highlighting without background interference
- **Manual Override**: Manual scan button available when scanner is stopped
- Responsive table showing prices, spreads, estimated profits, and profitability status
- Profitable opportunities highlighted with green indicators
- Select button enabled only for profitable pairs

### Arbitrage Detail Panel
- Appears when user selects a profitable pair from scanner
- Shows dual wallet layout with real-time balances and prices
- Displays arbitrage metrics: spread, drift, estimated profit
- Execute button performs wallet-local transactions only
- Transaction IDs generated for BUY (Wallet A) and SELL (Wallet B) operations

### Execution Logic
- BUY operation on PancakeSwap (Wallet A): Spend USDT, receive base token
- SELL operation on QuickSwap (Wallet B): Spend base token, receive USDT
- No cross-chain transfers or token bridging
- Wallet balances updated locally after execution
- All transactions logged to arbitrage history

## API Endpoints

- `GET /api/scan/all`: Returns price data and opportunities for all token pairs
- `GET /api/arbitrage/detail?pair=xxx`: Detailed wallet and arbitrage information
- `POST /api/arbitrage/execute`: Executes wallet-local buy/sell transactions
- `GET /api/arbitrage/history?pair=xxx`: Transaction history per token pair
- `GET /api/settings`: User configuration including profit thresholds