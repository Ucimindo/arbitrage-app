import { ethers } from "ethers";

// Environment validation
if (!process.env.PRIVATE_KEY_A) {
  throw new Error("PRIVATE_KEY_A environment variable is required");
}

if (!process.env.PRIVATE_KEY_B) {
  throw new Error("PRIVATE_KEY_B environment variable is required");
}

// Create providers for BSC and Polygon networks
export const providerBSC = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
export const providerPolygon = new ethers.JsonRpcProvider("https://polygon-rpc.com/");

// Create wallet signers
export const signerA = new ethers.Wallet(process.env.PRIVATE_KEY_A!, providerBSC);
export const signerB = new ethers.Wallet(process.env.PRIVATE_KEY_B!, providerPolygon);

// Export wallet addresses for logging and verification
export const walletAddressA = signerA.address;
export const walletAddressB = signerB.address;

// Helper function to get network info
export function getNetworkInfo() {
  return {
    walletA: {
      address: walletAddressA,
      network: "BSC",
      rpcUrl: "https://bsc-dataseed.binance.org/"
    },
    walletB: {
      address: walletAddressB,
      network: "Polygon", 
      rpcUrl: "https://polygon-rpc.com/"
    }
  };
}

// Utility function to check wallet balances
export async function getWalletBalances() {
  try {
    const balanceA = await providerBSC.getBalance(walletAddressA);
    const balanceB = await providerPolygon.getBalance(walletAddressB);
    
    return {
      walletA: {
        address: walletAddressA,
        balance: ethers.formatEther(balanceA),
        network: "BSC"
      },
      walletB: {
        address: walletAddressB,
        balance: ethers.formatEther(balanceB),
        network: "Polygon"
      }
    };
  } catch (error) {
    console.error("Error fetching wallet balances:", error);
    throw error;
  }
}