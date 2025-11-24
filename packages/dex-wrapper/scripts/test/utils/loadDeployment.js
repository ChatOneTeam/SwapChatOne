const fs = require("fs");
const path = require("path");

/**
 * Load deployment information from JSON file
 * @param {string} network - Network name (e.g., "bsc-testnet")
 * @returns {Object} Deployment information
 */
function loadDeployment(network) {
  // Get project root (3 levels up from scripts/test/utils/)
  const projectRoot = path.join(__dirname, "..", "..", "..");
  const deploymentPath = path.join(projectRoot, "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment file not found: ${deploymentPath}\nPlease deploy contracts first using: pnpm deploy:testnet`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  return deployment;
}

/**
 * Get contract addresses from deployment
 * @param {string} network - Network name
 * @returns {Object} Contract addresses
 */
function getContractAddresses(network) {
  const deployment = loadDeployment(network);
  return {
    feeManager: deployment.contracts.feeManager,
    pancakeSwapAdapter: deployment.contracts.pancakeSwapAdapter,
    router: deployment.contracts.router,
    chainId: deployment.chainId,
    deployer: deployment.deployer,
  };
}

module.exports = {
  loadDeployment,
  getContractAddresses,
};

