import { ethers } from "ethers";

// Environment validation with fallback for development
if (!process.env.PRIVATE_KEY_A) {
  console.warn("PRIVATE_KEY_A not set, using test wallet for development");
}

if (!process.env.PRIVATE_KEY_B) {
  console.warn("PRIVATE_KEY_B not set, using test wallet for development");
}

// Create providers for BSC and Polygon networks
export const providerBSC = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
export const providerPolygon = new ethers.JsonRpcProvider("https://polygon-rpc.com/");

// Create wallet signers with fallback for development
const privateKeyA = process.env.PRIVATE_KEY_A || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // test wallet
const privateKeyB = process.env.PRIVATE_KEY_B || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // test wallet

export const signerA = new ethers.Wallet(privateKeyA, providerBSC);
export const signerB = new ethers.Wallet(privateKeyB, providerPolygon);

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