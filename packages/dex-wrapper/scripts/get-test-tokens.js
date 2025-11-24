const hre = require("hardhat");
const { parseEther, formatEther } = require("ethers");

/**
 * Helper script to get test tokens on BSC Testnet
 * Provides instructions and attempts to get tokens from faucets
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🪙 BSC Testnet Test Token Helper");
  console.log("=".repeat(60));

  const network = hre.network.name;
  if (network !== "bsc-testnet") {
    console.log("\n⚠️  This script is for BSC Testnet only");
    console.log("   Current network:", network);
    return;
  }

  const [signer] = await hre.ethers.getSigners();
  const address = await signer.getAddress();
  const balance = await hre.ethers.provider.getBalance(address);

  console.log("\n📋 Account Information:");
  console.log("   Address:", address);
  console.log("   BNB Balance:", formatEther(balance), "BNB");

  // BSC Testnet token addresses
  const BUSD_TESTNET = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee";
  const WBNB_TESTNET = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];

  const busd = await hre.ethers.getContractAt(ERC20_ABI, BUSD_TESTNET);
  const wbnb = await hre.ethers.getContractAt(ERC20_ABI, WBNB_TESTNET);

  const busdBalance = await busd.balanceOf(address);
  const wbnbBalance = await wbnb.balanceOf(address);

  console.log("\n💰 Token Balances:");
  console.log("   BUSD:", formatEther(busdBalance));
  console.log("   WBNB:", formatEther(wbnbBalance));

  if (busdBalance < parseEther("1") || wbnbBalance < parseEther("0.1")) {
    console.log("\n📝 To get test tokens:");
    console.log("   1. BUSD Faucet: https://testnet.binance.org/faucet-smart");
    console.log("   2. WBNB: Wrap BNB using PancakeSwap or get from faucet");
    console.log("   3. Or use PancakeSwap Testnet: https://pancakeswap.finance/");
    console.log("\n   After getting tokens, run: pnpm run test:onchain");
  } else {
    console.log("\n✅ You have sufficient test tokens!");
    console.log("   Run: pnpm run test:onchain");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

