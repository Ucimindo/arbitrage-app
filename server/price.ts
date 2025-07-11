import { ethers } from "ethers";
import UNISWAP_V2_ROUTER_ABI from "./abis/uniswapV2Router.json";

export type PriceParams = {
  provider: ethers.JsonRpcProvider;
  routerAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
};

export type ChainConfig = {
  name: string;
  provider: ethers.JsonRpcProvider;
  router: string;
  tokens: {
    [key: string]: string;
  };
};

// Chain configuration for price fetching
export const CHAIN_CONFIG: { [chainId: number]: ChainConfig } = {
  56: {
    name: "BSC",
    provider: new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/"),
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap
    tokens: {
      USDT: "0x55d398326f99059fF775485246999027B3197955",
      BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
    }
  },
  137: {
    name: "Polygon",
    provider: new ethers.JsonRpcProvider("https://polygon-rpc.com/"),
    router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // QuickSwap
    tokens: {
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      WBTC: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
      WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      LINK: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
      WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
    }
  }
};

/**
 * Fetches the real-time price from a DEX router using getAmountsOut
 * @param params Price fetching parameters
 * @returns Amount of tokenOut for given tokenIn
 */
export async function getPriceFromRouter({
  provider,
  routerAddress,
  tokenIn,
  tokenOut,
  amountIn,
}: PriceParams): Promise<bigint> {
  try {
    const router = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, provider);
    const path = [tokenIn, tokenOut];
    
    // Get amounts out from the router
    const amountsOut = await router.getAmountsOut(amountIn, path);
    return amountsOut[1]; // Return the output token amount
  } catch (error) {
    console.error(`Error fetching price from router ${routerAddress}:`, error);
    throw new Error(`Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets token address by symbol and chain ID
 * @param symbol Token symbol (e.g., "USDT", "BTCB")
 * @param chainId Chain ID (56 for BSC, 137 for Polygon)
 * @returns Token contract address
 */
export function getTokenAddress(symbol: string, chainId: number): string {
  const config = CHAIN_CONFIG[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  const address = config.tokens[symbol.toUpperCase()];
  if (!address) {
    throw new Error(`Token ${symbol} not found on chain ${chainId}`);
  }
  
  return address;
}

/**
 * Fetches price for a token pair on a specific chain
 * @param tokenPair Token pair like "btc_usdt"
 * @param chainId Chain ID (56 or 137)
 * @param amountIn Amount of input token (default 1 unit)
 * @returns Price data with formatted values
 */
export async function getTokenPairPrice(
  tokenPair: string, 
  chainId: number, 
  amountIn?: bigint
): Promise<{
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  price: string;
  chainId: number;
  chainName: string;
}> {
  const config = CHAIN_CONFIG[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const [baseToken, quoteToken] = tokenPair.split('_');
  
  // Map token symbols to chain-specific tokens
  let baseSymbol: string;
  let quoteSymbol = quoteToken.toUpperCase();
  
  if (baseToken === 'btc') {
    baseSymbol = chainId === 56 ? 'BTCB' : 'WBTC';
  } else if (baseToken === 'eth') {
    baseSymbol = chainId === 56 ? 'ETH' : 'WETH';
  } else if (baseToken === 'wbnb') {
    baseSymbol = chainId === 56 ? 'WBNB' : 'WMATIC';
  } else {
    baseSymbol = baseToken.toUpperCase();
  }

  const tokenInAddress = getTokenAddress(baseSymbol, chainId);
  const tokenOutAddress = getTokenAddress(quoteSymbol, chainId);
  
  // Default to 1 unit with appropriate decimals
  const defaultAmountIn = amountIn || BigInt("1000000000000000000"); // 1 token with 18 decimals
  
  const amountOut = await getPriceFromRouter({
    provider: config.provider,
    routerAddress: config.router,
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    amountIn: defaultAmountIn,
  });

  // Format the price (amountOut / amountIn)
  const price = (Number(amountOut) / Number(defaultAmountIn)).toFixed(8);

  return {
    tokenIn: baseSymbol,
    tokenOut: quoteSymbol,
    amountIn: ethers.formatEther(defaultAmountIn),
    amountOut: ethers.formatEther(amountOut),
    price,
    chainId,
    chainName: config.name
  };
}

/**
 * Checks if a chain is supported for price fetching
 * @param chainId Chain ID to check
 * @returns True if chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_CONFIG;
}

/**
 * Gets all supported chain IDs
 * @returns Array of supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(CHAIN_CONFIG).map(Number);
}