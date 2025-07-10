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

## Version History

### Version 0.1.1 - Initial Development (July 10, 2025)
**Stable baseline version without authentication - all core features functional**

Core Features Implemented:
- ✅ Real-time arbitrage monitoring between PancakeSwap (BNB Chain) and QuickSwap (Polygon)
- ✅ Multi-token pair support (BTC/USDT, ETH/USDT, CAKE/USDT, LINK/USDT, WBNB/USDT)
- ✅ Manual price scanning with automatic scanner mode (5-second intervals)
- ✅ Dual wallet management with real-time balance tracking
- ✅ Flexible profit threshold system (fixed USDT amounts or percentage-based)
- ✅ Automated execution system with session controls and limits
- ✅ Comprehensive transaction logging with execution type tracking
- ✅ Transaction history export (CSV/JSON formats)
- ✅ WebSocket real-time updates and responsive UI
- ✅ Settings configuration with scanner restart protection

Technical Architecture:
- Frontend: React 18 + Vite + TailwindCSS + shadcn/ui components
- Backend: Express.js + TypeScript + WebSocket server
- Database: PostgreSQL + Drizzle ORM with 4 main tables
- No authentication system (removed for simplicity)
- RESTful API with 12+ endpoints for complete functionality

This version represents a fully functional arbitrage monitoring platform ready for development and testing.

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
- **July 08, 2025**: Enhanced multi-token support in backend
  - Added quoteSymbol and baseSymbol fields to all API responses
  - Replaced hardcoded USDT assumptions with dynamic quote token handling
  - Updated /api/scan/all and /api/arbitrage/detail endpoints for token-awareness
  - Enhanced profit calculations to work with any BASE/QUOTE combination
  - Future-ready for DAI, USDC, BUSD, and other quote tokens
- **July 08, 2025**: Implemented full dashboard refresh functionality
  - Added comprehensive refresh button in navbar with visual feedback
  - Refresh clears selected token pair and invalidates all TanStack Query cache
  - Added spinning animation and toast notification for user feedback
  - Provides complete UI reset without browser reload
- **July 08, 2025**: Enhanced trading settings with flexible profit thresholds
  - Added toggle between fixed profit (USDT) and percentage-based thresholds
  - Integrated gas fee calculations (BNB Chain + Polygon estimates)
  - Real-time profit calculations showing raw threshold + gas fees
  - Updated backend logic to use new threshold mode for all arbitrage decisions
  - Visual profit calculator in settings modal with net profit requirements
- **July 08, 2025**: Implemented auto execution system with session controls
  - Added execution_type column to arbitrage_log table (auto/manual)
  - Built session-based limiting with configurable duration and max trades
  - Added auto execution controls in settings: interval, session duration, max executions
  - Scanner automatically executes profitable opportunities when enabled
  - Transaction log shows [auto] tag for automated executions
  - Session protection prevents runaway auto execution loops
- **July 08, 2025**: Enhanced settings consistency with scanner restart protection
  - Added scanner state awareness to settings modal with visual warning alerts
  - Settings changes apply only after scanner restart to prevent race conditions
  - Fresh settings loaded from backend on each scanner start for consistency
  - Yellow alert banner shows when scanner is running: "Changes will take effect after scanner restart"
  - Prevents partial configuration updates during active scanning sessions
- **July 08, 2025**: Implemented comprehensive transaction enhancements and UI upgrades
  - **Enhanced Transaction View**: Replaced minimal log with detailed table showing token pair, execution type ([auto] badges), wallet details, buy/sell prices, profit amounts, simulated TX hashes, and timestamps
  - **Full Transaction History Modal**: Added "View All Transactions" modal with complete history, pagination support, and comprehensive transaction details
  - **Scanner Session Parameters**: Added configurable scanner interval (1-60 sec), session duration (60-3600 sec), and max executions per session settings
  - **Profit Threshold Mode Toggle**: Implemented switch between fixed USDT amounts and percentage-based thresholds with real-time profit calculator
  - **Enhanced Auto Execution Logging**: Extended database schema with walletA, walletB, buyPrice, sellPrice, profit, and txHash fields for complete transaction audit trail
  - **Dynamic Scan Interval Display**: Scanner now shows "Next scan in X seconds" using actual configured interval from settings
  - **Complete Database Migration**: Updated arbitrage_log table with new transaction tracking fields while maintaining backward compatibility
  - **Live Countdown Timer**: Real-time countdown showing exact remaining seconds until next scan with proper singular/plural handling
- **July 08, 2025**: Implemented transaction log export functionality
  - **CSV Export**: Download complete transaction history in Excel-compatible format
  - **JSON Export**: Export structured data for debugging and system integration
  - **Export Features**: Complete audit trail with ID, token pair, execution type, prices, profits, wallet details, TX hashes, and timestamps
  - **Backend Endpoints**: `/api/arbitrage/export/csv` and `/api/arbitrage/export/json` with proper headers and file download handling
  - **Frontend Integration**: Export buttons in transaction log component with download icons and direct file access
- **July 09, 2025**: Completed comprehensive authentication system for production security
  - **User Authentication**: Secure bcrypt password hashing with database storage in users table
  - **Session Management**: PostgreSQL-backed sessions with express-session and 1-hour expiration
  - **Route Protection**: All API endpoints secured with requireAuth middleware, returning 401 for unauthorized access
  - **CORS Configuration**: Proper CORS setup with credentials enabled for frontend cookie authentication
  - **Frontend Integration**: Login component with form validation and useAuth hook for authentication state
  - **Default Credentials**: Admin user created with username "admin" and secure password for initial access
  - **Production Ready**: Complete authentication system essential for deployment with real wallet connections
- **July 09, 2025**: Fixed critical authentication and connection issues for seamless user experience
  - **API Connection Fix**: Resolved "net::ERR_CONNECTION_REFUSED" by switching from cross-origin to same-origin requests
  - **Environment Configuration**: Updated API_BASE to use relative URLs instead of explicit localhost:5000
  - **Authentication Flow**: Fixed useAuth hook to use correct API request format and proper session handling
  - **Error Handling**: Enhanced transaction components with proper authentication and array validation
  - **Component Stability**: Fixed "transactions?.map is not a function" error with proper type checking
  - **Session Persistence**: Login now properly redirects to dashboard with full page reload for auth state reset
- **July 09, 2025**: Rolled back authentication system due to component compatibility issues
  - **Authentication Removal**: Completely removed user authentication system and session management
  - **Route Simplification**: Removed all requireAuth middleware from API endpoints
  - **Frontend Cleanup**: Simplified App.tsx to directly load dashboard without login protection
  - **useAuth Stub**: Replaced complex auth hook with simple stub that returns authenticated state
  - **Session Cleanup**: Removed express-session and all session-related middleware
  - **Database Optimization**: Removed authentication tables and session storage dependencies
- **July 10, 2025**: Finalized version 0.1.1 as stable initial development baseline
  - **Version Milestone**: Established v0.1.1 as reference point for all core functionality
  - **Clean Navbar**: Removed final authentication elements from user interface
  - **Stable State**: All arbitrage features working without authentication barriers
  - **Documentation**: Updated replit.md with comprehensive version history and feature list
- **July 10, 2025**: Enhanced arbitrage execution endpoint with independent wallet simulation
  - **Independent Transactions**: Wallet A (BSC) and Wallet B (Polygon) execute separately with individual success/failure states
  - **Exact JSON Response**: Returns txA/txB objects with status, network, hash fields plus totalProfit as specified
  - **95% Success Rate**: Realistic transaction simulation with occasional failures for testing
  - **Proper Error Handling**: Returns detailed transaction status even on failures
  - **Enhanced Logging**: Improved transaction hash generation and execution tracking
- **July 10, 2025**: Implemented real DEX router integration with Uniswap v2 compatible contracts
  - **Real Swap Logic**: Created executeSwap() function using ethers.js with PancakeSwap/QuickSwap routers
  - **Token Approval**: Automatic ERC20 approve() calls when allowance insufficient
  - **Slippage Protection**: Real getAmountsOut() calls with configurable slippage tolerance
  - **Chain-Agnostic Design**: Modular executor.ts supports any EVM chain with router configuration
  - **Development/Production Mode**: Smart detection switches between simulation and real blockchain calls
  - **Comprehensive Error Handling**: Detailed error parsing for insufficient funds, slippage, deadlines
  - **ABI Integration**: Added Uniswap V2 Router and ERC20 contract ABIs for real DEX interactions

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
- `GET /api/arbitrage/export/csv`: Download all transaction logs as CSV file
- `GET /api/arbitrage/export/json`: Download all transaction logs as JSON file