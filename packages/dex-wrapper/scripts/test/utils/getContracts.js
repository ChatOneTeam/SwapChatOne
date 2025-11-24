const hre = require("hardhat");
const { getContractAddresses } = require("./loadDeployment");

/**
 * Get deployed contract instances
 * @param {string} network - Network name
 * @returns {Object} Contract instances
 */
async function getContracts(network) {
  const addresses = getContractAddresses(network);

  const FeeManager = await hre.ethers.getContractFactory("FeeManager");
  const PancakeSwapV3Adapter = await hre.ethers.getContractFactory(
    "PancakeSwapV3Adapter"
  );
  const DexWrapperRouter = await hre.ethers.getContractFactory(
    "DexWrapperRouter"
  );

  return {
    feeManager: FeeManager.attach(addresses.feeManager),
    adapter: PancakeSwapV3Adapter.attach(addresses.pancakeSwapAdapter),
    router: DexWrapperRouter.attach(addresses.router),
    addresses,
  };
}

/**
 * Get test tokens (BUSD and WBNB on BSC Testnet)
 * @returns {Object} Token contract instances
 */
async function getTestTokens() {
  // BSC Testnet token addresses
  const BUSD_TESTNET = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee";
  const WBNB_TESTNET = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function transfer(address,uint256) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
  ];

  const busd = await hre.ethers.getContractAt(ERC20_ABI, BUSD_TESTNET);
  const wbnb = await hre.ethers.getContractAt(ERC20_ABI, WBNB_TESTNET);

  return { busd, wbnb, addresses: { busd: BUSD_TESTNET, wbnb: WBNB_TESTNET } };
}

module.exports = {
  getContracts,
  getTestTokens,
};

