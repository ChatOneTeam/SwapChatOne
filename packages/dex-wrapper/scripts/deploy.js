const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @title Deployment Script for DEX Wrapper
 * @notice Deploys FeeManager, PancakeSwapV3Adapter, and DexWrapperRouter
 */
async function main() {
  // 检查环境变量 PRIVATE_KEY 是否设置
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.trim() === "") {
    throw new Error(
      "❌ PRIVATE_KEY 环境变量未设置或为空！\n" +
      "   请在 .env 文件中设置 PRIVATE_KEY=your_private_key"
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("🚀 DEX Wrapper Contract Deployment");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  
  // 验证 deployer 是否从环境变量正确加载
  if (!deployer || deployer.address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "❌ Deployer 未正确加载！\n" +
      "   请检查 .env 文件中的 PRIVATE_KEY 是否正确设置"
    );
  }
  
  // 验证账户数量
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "❌ 没有可用的账户！\n" +
      "   请检查 hardhat.config.js 中的 accounts 配置"
    );
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    const minBalance = hre.ethers.parseEther("0.01");
    if (balance < minBalance) {
      throw new Error(
        `Insufficient balance. Need at least ${hre.ethers.formatEther(minBalance)} BNB`
      );
    }
  }

  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  // Configuration
  const feeRate = 10; // 0.1% (10 basis points)
  // 主网使用指定的费用接收地址，测试网使用部署者地址
  const MAINNET_FEE_RECIPIENT = "0x29d7982122c1e922e49b5ff8c98036407e661d3f";
  const feeRecipient = hre.network.config.chainId === 56n
    ? MAINNET_FEE_RECIPIENT // 主网费用接收地址
    : deployer.address; // 测试网使用部署者地址
  
  if (hre.network.config.chainId === 56n) {
    console.log("⚠️  主网部署 - 费用接收地址:", MAINNET_FEE_RECIPIENT);
  }

  // PancakeSwap V3 addresses
  // BSC Mainnet
  const pancakeSwapRouter =
    hre.network.config.chainId === 56n
      ? "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4"
      : "0x9a489505a00cE272eAa5e07Dba6491314CaE3796"; // BSC Testnet

  const pancakeSwapQuoter =
    hre.network.config.chainId === 56n
      ? "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997"
      : "0x78D78E420Da98ad357D5bE90E7d6AA1AB96875c3"; // BSC Testnet (can be address(0) if not available)

  // Step 1: Deploy FeeManager
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 1: Deploying FeeManager...");
  console.log("=".repeat(60));
  const FeeManager = await hre.ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(feeRate, feeRecipient);
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  console.log("✅ FeeManager deployed to:", feeManagerAddress);
  console.log("   Fee Rate:", feeRate, "basis points (0.1%)");
  console.log("   Fee Recipient:", feeRecipient);
  deploymentInfo.contracts.feeManager = feeManagerAddress;

  // Step 2: Deploy PancakeSwapV3Adapter
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 2: Deploying PancakeSwapV3Adapter...");
  console.log("=".repeat(60));
  const PancakeSwapV3Adapter = await hre.ethers.getContractFactory(
    "PancakeSwapV3Adapter"
  );
  // Use zero address for quoter if checksum is invalid or not available
  const quoterAddress = pancakeSwapQuoter && pancakeSwapQuoter !== "0x78D78E420Da98ad357D5bE90E7d6AA1AB96875c3"
    ? pancakeSwapQuoter
    : hre.ethers.ZeroAddress; // Use zero address for testnet if quoter not available
  const adapter = await PancakeSwapV3Adapter.deploy(
    pancakeSwapRouter,
    quoterAddress
  );
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("✅ PancakeSwapV3Adapter deployed to:", adapterAddress);
  console.log("   SwapRouter:", pancakeSwapRouter);
  console.log("   Quoter:", quoterAddress === hre.ethers.ZeroAddress ? "Not set (address(0))" : quoterAddress);
  deploymentInfo.contracts.pancakeSwapAdapter = adapterAddress;

  // Step 3: Deploy DexWrapperRouter
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 3: Deploying DexWrapperRouter...");
  console.log("=".repeat(60));
  const DexWrapperRouter = await hre.ethers.getContractFactory(
    "DexWrapperRouter"
  );
  const router = await DexWrapperRouter.deploy(feeManagerAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ DexWrapperRouter deployed to:", routerAddress);
  deploymentInfo.contracts.router = routerAddress;

  // Step 4: Register adapter
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 4: Registering PancakeSwapV3Adapter...");
  console.log("=".repeat(60));
  const chainId = Number(network.chainId);
  const tx = await router.registerAdapter(chainId, adapterAddress);
  await tx.wait();
  console.log("✅ Adapter registered for chain ID:", chainId);

  // Save deployment info
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}.json`
  );
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  console.log("  FeeManager:", feeManagerAddress);
  console.log("  PancakeSwapV3Adapter:", adapterAddress);
  console.log("  DexWrapperRouter:", routerAddress);
  console.log("\nDeployment info saved to:", deploymentPath);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

