import { ethers } from "ethers";
import UNISWAP_V2_ROUTER_ABI from "./abis/uniswapV2Router.json";
import ERC20_ABI from "./abis/erc20.json";

export type SwapParams = {
  signer: ethers.Wallet;
  routerAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  slippage: number; // in percentage, e.g. 0.5
  chainId: number;
};

export type SwapResult = {
  txHash: string;
  status: "success" | "failed";
  error?: string;
  gasUsed?: string;
  amountOut?: string;
};

/**
 * Executes a token swap on any DEX using Uniswap v2/v3 compatible router
 * This function is chain-agnostic and can work with any EVM-compatible network
 * 
 * @param params - Swap parameters including signer, router, tokens, amount, slippage, and chain
 * @returns Promise resolving to swap result with transaction hash and status
 */
export async function executeSwap({
  signer,
  routerAddress,
  tokenIn,
  tokenOut,
  amountIn,
  slippage,
  chainId
}: SwapParams): Promise<SwapResult> {
  try {
    // Validate input parameters
    if (!signer || !routerAddress || !tokenIn || !tokenOut || !amountIn) {
      throw new Error("Missing required swap parameters");
    }

    if (slippage < 0 || slippage > 100) {
      throw new Error("Slippage must be between 0 and 100 percent");
    }

    // Log swap attempt for debugging
    console.log(`Executing real swap on chain ${chainId}:`, {
      from: signer.address,
      router: routerAddress,
      tokenIn: tokenIn.slice(0, 10) + "...",
      tokenOut: tokenOut.slice(0, 10) + "...",
      amountIn: amountIn.toString(),
      slippage
    });

    // Check if we're in development mode with test keys
    const isDevelopmentMode = process.env.NODE_ENV === 'development' && 
                             (!process.env.PRIVATE_KEY_A || !process.env.PRIVATE_KEY_B);
    
    if (isDevelopmentMode) {
      console.log("🔧 Development mode: Using simulation instead of real blockchain calls");
      return simulateSwap(amountIn, slippage);
    }

    // Create contract instances
    const routerContract = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);

    // 1. Check current allowance
    const currentAllowance = await tokenInContract.allowance(signer.address, routerAddress);
    console.log(`Current allowance: ${currentAllowance.toString()}`);

    // 2. Approve tokenIn for router if needed
    if (currentAllowance < amountIn) {
      console.log(`Approving ${amountIn.toString()} tokens for router...`);
      const approveTx = await tokenInContract.approve(routerAddress, amountIn);
      const approveReceipt = await approveTx.wait();
      console.log(`Approval confirmed: ${approveReceipt.hash}`);
    }

    // 3. Build swap path
    const path = [tokenIn, tokenOut];
    console.log(`Swap path: ${path.join(" -> ")}`);

    // 4. Get expected amounts out and calculate minimum with slippage
    const amountsOut = await routerContract.getAmountsOut(amountIn, path);
    const expectedAmountOut = amountsOut[1];
    const minAmountOut = expectedAmountOut * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
    
    console.log(`Expected amount out: ${expectedAmountOut.toString()}`);
    console.log(`Min amount out (${slippage}% slippage): ${minAmountOut.toString()}`);

    // 5. Set deadline (20 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 1200;

    // 6. Execute the swap
    console.log(`Executing swapExactTokensForTokens...`);
    const swapTx = await routerContract.swapExactTokensForTokens(
      amountIn,
      minAmountOut,
      path,
      signer.address,
      deadline
    );

    // 7. Wait for transaction confirmation
    console.log(`Transaction sent: ${swapTx.hash}`);
    const receipt = await swapTx.wait();
    
    if (receipt.status === 1) {
      console.log(`Swap successful! Gas used: ${receipt.gasUsed.toString()}`);
      
      return {
        txHash: receipt.hash,
        status: "success",
        gasUsed: receipt.gasUsed.toString(),
        amountOut: expectedAmountOut.toString()
      };
    } else {
      throw new Error("Transaction failed");
    }

  } catch (error) {
    console.error(`Swap execution failed on chain ${chainId}:`, error);
    
    // Parse common error messages
    let errorMessage = "Unknown swap error";
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("insufficient")) {
        errorMessage = "Insufficient token balance or gas";
      } else if (message.includes("slippage")) {
        errorMessage = "Slippage tolerance exceeded";
      } else if (message.includes("deadline")) {
        errorMessage = "Transaction deadline exceeded";
      } else if (message.includes("pair")) {
        errorMessage = "Trading pair not found";
      } else if (message.includes("allowance")) {
        errorMessage = "Token allowance insufficient";
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      txHash: "",
      status: "failed",
      error: errorMessage
    };
  }
}

/**
 * Chain configuration for different networks
 * This makes it easy to add new chains without modifying core logic
 */
export const CHAIN_CONFIG = {
  // BSC (BNB Chain)
  56: {
    name: "BSC",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    routerAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap V2 Router
    nativeToken: "0xbb4CdB9CBd36B01bD1cBaeBF2De08d9173bc095c", // WBNB
    gasPrice: "5000000000" // 5 gwei
  },
  
  // Polygon
  137: {
    name: "Polygon", 
    rpcUrl: "https://polygon-rpc.com/",
    routerAddress: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // QuickSwap Router
    nativeToken: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    gasPrice: "30000000000" // 30 gwei
  }
  
  // Future chains can be added here:
  // 1: { name: "Ethereum", rpcUrl: "...", routerAddress: "...", ... },
  // 43114: { name: "Avalanche", rpcUrl: "...", routerAddress: "...", ... },
  // 250: { name: "Fantom", rpcUrl: "...", routerAddress: "...", ... }
} as const;

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number) {
  return CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
}

/**
 * Helper function to validate if a chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_CONFIG;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(CHAIN_CONFIG).map(Number);
}

/**
 * Simulate swap execution for development mode
 */
function simulateSwap(amountIn: bigint, slippage: number): SwapResult {
  // Simulate network delay
  const delay = 1000 + Math.random() * 2000;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate occasional failures (5% failure rate)
      const shouldFail = Math.random() < 0.05;
      
      if (shouldFail) {
        const errors = [
          "Insufficient gas fee",
          "Slippage tolerance exceeded", 
          "Insufficient token balance",
          "Router contract error",
          "Network congestion"
        ];
        
        resolve({
          txHash: "",
          status: "failed",
          error: errors[Math.floor(Math.random() * errors.length)]
        });
      } else {
        // Generate realistic transaction hash
        const txHash = "0x" + Math.random().toString(16).slice(2, 10).padEnd(64, "0");
        
        // Simulate gas usage and output amount
        const gasUsed = (21000 + Math.floor(Math.random() * 200000)).toString();
        const amountOut = (Number(amountIn) * (0.995 + Math.random() * 0.01)).toString();

        resolve({
          txHash,
          status: "success",
          gasUsed,
          amountOut
        });
      }
    }, delay);
  });
}