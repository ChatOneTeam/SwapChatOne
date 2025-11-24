const hre = require("hardhat");

/**
 * Check if a pool exists on PancakeSwap V3
 * @param {string} token0 - Token 0 address
 * @param {string} token1 - Token 1 address
 * @param {number} fee - Fee tier
 * @returns {boolean} - Whether pool exists
 */
async function checkPoolExists(token0, token1, fee) {
  try {
    // PancakeSwap V3 Pool Factory address (BSC Testnet)
    const FACTORY_TESTNET = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
    
    const FACTORY_ABI = [
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    ];
    
    const factory = await hre.ethers.getContractAt(FACTORY_ABI, FACTORY_TESTNET);
    
    // Sort tokens (token0 < token1)
    const [t0, t1] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];
    
    const poolAddress = await factory.getPool(t0, t1, fee);
    return poolAddress !== hre.ethers.ZeroAddress;
  } catch (error) {
    return false;
  }
}

/**
 * Find available pools for a token pair
 * @param {string} token0 - Token 0 address
 * @param {string} token1 - Token 1 address
 * @returns {Array} - Array of available fee tiers
 */
async function findAvailablePools(token0, token1) {
  const feeTiers = [500, 2500, 3000, 10000];
  const availablePools = [];
  
  for (const fee of feeTiers) {
    const exists = await checkPoolExists(token0, token1, fee);
    if (exists) {
      availablePools.push(fee);
    }
  }
  
  return availablePools;
}

module.exports = {
  checkPoolExists,
  findAvailablePools,
};

