import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const DexWrapperModule = buildModule("DexWrapperModule", (m) => {
  // Configuration parameters
  const feeRate = m.getParameter("feeRate", 10); // 0.1% (10 basis points)
  const feeRecipient = m.getParameter(
    "feeRecipient",
    "0x0000000000000000000000000000000000000000"
  );

  // PancakeSwap V3 addresses on BSC
  // Mainnet: https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v3-contracts
  const pancakeSwapRouter = m.getParameter(
    "pancakeSwapRouter",
    "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4" // BSC Mainnet
  );
  const pancakeSwapQuoter = m.getParameter(
    "pancakeSwapQuoter",
    "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997" // BSC Mainnet
  );

  // Deploy FeeManager
  const feeManager = m.contract("FeeManager", [feeRate, feeRecipient]);

  // Deploy PancakeSwapV3Adapter
  const pancakeSwapAdapter = m.contract("PancakeSwapV3Adapter", [
    pancakeSwapRouter,
    pancakeSwapQuoter,
  ]);

  // Deploy DexWrapperRouter
  const router = m.contract("DexWrapperRouter", [feeManager]);

  // Register BSC adapter (chain ID 56)
  m.call(router, "registerAdapter", [56, pancakeSwapAdapter]);

  return { feeManager, pancakeSwapAdapter, router };
});

export default DexWrapperModule;

