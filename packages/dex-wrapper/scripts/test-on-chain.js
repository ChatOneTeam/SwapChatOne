const hre = require("hardhat");
const { getContracts, getTestTokens } = require("./test/utils/getContracts");
const { testFeeManager } = require("./test/scenarios/testFeeManager");
const { testAdapter } = require("./test/scenarios/testAdapter");
const { testRouter } = require("./test/scenarios/testRouter");
const { testSwap } = require("./test/scenarios/testSwap");
const { generateReport } = require("./test/report");

/**
 * Complete on-chain test suite for DEX Wrapper
 * Tests all functionality on BSC Testnet
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🧪 DEX Wrapper 链上测试套件");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log("\n网络:", network);
  console.log("链 ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("测试账户:", await signer.getAddress());
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("余额:", hre.ethers.formatEther(balance), "BNB");

  if (network !== "bsc-testnet" && network !== "bsc") {
    console.log("\n⚠️  警告: 此脚本专为 BSC 网络设计");
    console.log("   当前网络:", network);
  }

  try {
    // Load contracts
    console.log("\n" + "=".repeat(60));
    console.log("📦 加载已部署的合约");
    console.log("=".repeat(60));
    const contracts = await getContracts(network);
    console.log("✅ 合约已加载:");
    console.log("   FeeManager:", contracts.addresses.feeManager);
    console.log("   PancakeSwapV3Adapter:", contracts.addresses.pancakeSwapAdapter);
    console.log("   DexWrapperRouter:", contracts.addresses.router);

    // Get test tokens
    console.log("\n📝 加载测试代币...");
    const tokens = await getTestTokens();
    console.log("✅ 测试代币已加载:");
    console.log("   BUSD:", tokens.addresses.busd);
    console.log("   WBNB:", tokens.addresses.wbnb);

    // Run test suites
    const allResults = {};

    // Test 1: FeeManager
    allResults["FeeManager"] = await testFeeManager(contracts, signer);

    // Test 2: Adapter
    allResults["Adapter"] = await testAdapter(contracts, signer);

    // Test 3: Router
    allResults["Router"] = await testRouter(contracts, tokens, signer);

    // Test 4: Swap (requires tokens)
    allResults["Swap"] = await testSwap(contracts, tokens, signer);

    // Generate report
    const summary = generateReport(allResults);

    // Final status
    console.log("\n" + "=".repeat(60));
    if (summary.totalFailed === 0) {
      console.log("✅ 所有测试通过!");
      console.log("=".repeat(60));
      process.exit(0);
    } else {
      console.log("❌ 部分测试失败。请查看上面的报告。");
      console.log("=".repeat(60));
      process.exit(1);
    }

  } catch (error) {
    console.error("\n❌ 测试套件失败:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

