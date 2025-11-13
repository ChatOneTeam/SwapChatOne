const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Vault
  console.log("\n1. Deploying ChatOneSwapVault...");
  const ChatOneSwapVault = await hre.ethers.getContractFactory("ChatOneSwapVault");
  const vault = await ChatOneSwapVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("ChatOneSwapVault deployed to:", vaultAddress);

  // Deploy PoolManager
  console.log("\n2. Deploying ChatOneSwapPoolManager...");
  const ChatOneSwapPoolManager = await hre.ethers.getContractFactory("ChatOneSwapPoolManager");
  const poolManager = await ChatOneSwapPoolManager.deploy(vaultAddress);
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("ChatOneSwapPoolManager deployed to:", poolManagerAddress);

  // Deploy Router
  console.log("\n3. Deploying ChatOneSwapRouter...");
  const ChatOneSwapRouter = await hre.ethers.getContractFactory("ChatOneSwapRouter");
  const router = await ChatOneSwapRouter.deploy(poolManagerAddress, vaultAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("ChatOneSwapRouter deployed to:", routerAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      vault: vaultAddress,
      poolManager: poolManagerAddress,
      router: routerAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  const deploymentDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  // Wait for block confirmations
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await vault.deploymentTransaction()?.wait(5);
    await poolManager.deploymentTransaction()?.wait(5);
    await router.deploymentTransaction()?.wait(5);
    console.log("Confirmed!");
  }

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nContract Addresses:");
  console.log("  Vault:", vaultAddress);
  console.log("  PoolManager:", poolManagerAddress);
  console.log("  Router:", routerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

