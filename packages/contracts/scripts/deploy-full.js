const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @title Full Deployment Script
 * @notice Deploys all contracts and sets up initial configuration
 * @dev Includes Vault, PoolManager, Router, and Timelock
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=".repeat(60));
  console.log("🚀 ChatOneSwap Contract Deployment");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    const minBalance = hre.ethers.parseEther("0.1");
    if (balance < minBalance) {
      throw new Error(`Insufficient balance. Need at least ${hre.ethers.formatEther(minBalance)} BNB`);
    }
  }

  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(network.chainId), // Convert BigInt to Number
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  // Step 1: Deploy Vault
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 1: Deploying ChatOneSwapVault...");
  console.log("=".repeat(60));
  const ChatOneSwapVault = await hre.ethers.getContractFactory("ChatOneSwapVault");
  const vault = await ChatOneSwapVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ ChatOneSwapVault deployed to:", vaultAddress);
  deploymentInfo.contracts.vault = vaultAddress;

  // Step 2: Deploy PoolManager
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 2: Deploying ChatOneSwapPoolManager...");
  console.log("=".repeat(60));
  const ChatOneSwapPoolManager = await hre.ethers.getContractFactory("ChatOneSwapPoolManager");
  const poolManager = await ChatOneSwapPoolManager.deploy(vaultAddress);
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("✅ ChatOneSwapPoolManager deployed to:", poolManagerAddress);
  deploymentInfo.contracts.poolManager = poolManagerAddress;

  // Step 3: Deploy Router
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 3: Deploying ChatOneSwapRouter...");
  console.log("=".repeat(60));
  const ChatOneSwapRouter = await hre.ethers.getContractFactory("ChatOneSwapRouter");
  const router = await ChatOneSwapRouter.deploy(poolManagerAddress, vaultAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ ChatOneSwapRouter deployed to:", routerAddress);
  deploymentInfo.contracts.router = routerAddress;

  // Step 4: Deploy Timelock
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 4: Deploying ChatOneSwapTimelock...");
  console.log("=".repeat(60));
  const ChatOneSwapTimelock = await hre.ethers.getContractFactory("ChatOneSwapTimelock");
  const timelock = await ChatOneSwapTimelock.deploy();
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("✅ ChatOneSwapTimelock deployed to:", timelockAddress);
  deploymentInfo.contracts.timelock = timelockAddress;

  // Step 5: Configure Vault
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  Step 5: Configuring Vault...");
  console.log("=".repeat(60));
  
  console.log("Setting PoolManager in Vault...");
  const tx1 = await vault.setPoolManager(poolManagerAddress);
  await tx1.wait();
  console.log("✅ PoolManager set in Vault");
  
  console.log("Setting Timelock in Vault...");
  const tx2 = await vault.setTimelock(timelockAddress);
  await tx2.wait();
  console.log("✅ Timelock set in Vault");

  // Step 6: Configure PoolManager
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  Step 6: Configuring PoolManager...");
  console.log("=".repeat(60));
  
  console.log("Setting Router in PoolManager...");
  const tx3 = await poolManager.setRouter(routerAddress);
  await tx3.wait();
  console.log("✅ Router set in PoolManager");
  
  console.log("Setting Timelock in PoolManager...");
  const tx4 = await poolManager.setTimelock(timelockAddress);
  await tx4.wait();
  console.log("✅ Timelock set in PoolManager");

  // Step 7: Configure Router
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  Step 7: Configuring Router...");
  console.log("=".repeat(60));
  
  console.log("Setting Timelock in Router...");
  const tx5 = await router.setTimelock(timelockAddress);
  await tx5.wait();
  console.log("✅ Timelock set in Router");

  // Step 8: Transfer Timelock ownership
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  Step 8: Transferring Timelock ownership...");
  console.log("=".repeat(60));
  
  // Note: Timelock ownership should be transferred to a multisig or governance contract
  // For now, we'll keep it with deployer, but this should be changed in production
  console.log("⚠️  WARNING: Timelock ownership is still with deployer!");
  console.log("⚠️  In production, transfer ownership to a multisig wallet!");
  // Uncomment the following line to transfer ownership:
  // const tx6 = await timelock.transferOwnership(multisigAddress);
  // await tx6.wait();

  // Wait for block confirmations (for non-local networks)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n" + "=".repeat(60));
    console.log("⏳ Waiting for block confirmations...");
    console.log("=".repeat(60));
    await vault.deploymentTransaction()?.wait(5);
    await poolManager.deploymentTransaction()?.wait(5);
    await router.deploymentTransaction()?.wait(5);
    await timelock.deploymentTransaction()?.wait(5);
    console.log("✅ All transactions confirmed!");
  }

  // Save deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  const deploymentDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n" + "=".repeat(60));
  console.log("📝 Deployment Summary");
  console.log("=".repeat(60));
  console.log("Deployment info saved to:", deploymentPath);
  console.log("\nContract Addresses:");
  console.log("  Vault:        ", vaultAddress);
  console.log("  PoolManager:  ", poolManagerAddress);
  console.log("  Router:       ", routerAddress);
  console.log("  Timelock:     ", timelockAddress);
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment completed successfully!");
  console.log("=".repeat(60));
  
  // Print verification commands
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📋 Verification Commands:");
    console.log(`  npx hardhat verify --network ${hre.network.name} ${vaultAddress}`);
    console.log(`  npx hardhat verify --network ${hre.network.name} ${poolManagerAddress} ${vaultAddress}`);
    console.log(`  npx hardhat verify --network ${hre.network.name} ${routerAddress} ${poolManagerAddress} ${vaultAddress}`);
    console.log(`  npx hardhat verify --network ${hre.network.name} ${timelockAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });

