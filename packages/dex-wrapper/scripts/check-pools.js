const hre = require("hardhat");
const { formatEther } = require("ethers");

/**
 * 检查 BSC 测试网上 PancakeSwap V3 的池子
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🔍 检查 BSC 测试网 PancakeSwap V3 池子");
  console.log("=".repeat(60));

  const network = hre.network.name;
  if (network !== "bsc-testnet") {
    console.log("\n⚠️  此脚本仅适用于 BSC 测试网");
    console.log("   当前网络:", network);
    return;
  }

  // PancakeSwap V3 Factory address (BSC Testnet)
  const FACTORY_TESTNET = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
  
  const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  ];

  // Pool ABI to get liquidity info
  const POOL_ABI = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  ];

  // ERC20 ABI to get token info
  const ERC20_ABI = [
    "function symbol() external view returns (string)",
    "function name() external view returns (string)",
    "function decimals() external view returns (uint8)",
  ];

  const factory = await hre.ethers.getContractAt(FACTORY_ABI, FACTORY_TESTNET);

  // BSC Testnet token addresses
  const TOKENS = {
    WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    BUSD: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
    // 添加更多测试代币地址
    USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // BSC Testnet USDT
    USDC: "0x64544969ed7EBf5f083679233325356EbE738930", // BSC Testnet USDC
  };

  const feeTiers = [500, 2500, 3000, 10000];
  const feeNames = {
    500: "0.05%",
    2500: "0.25%",
    3000: "0.3%",
    10000: "1%",
  };

  // 要检查的代币对
  const pairs = [
    { token0: "WBNB", token1: "BUSD" },
    { token0: "WBNB", token1: "USDT" },
    { token0: "WBNB", token1: "USDC" },
    { token0: "BUSD", token1: "USDT" },
    { token0: "BUSD", token1: "USDC" },
    { token0: "USDT", token1: "USDC" },
  ];

  console.log("\n📋 检查的代币对:");
  pairs.forEach(pair => {
    console.log(`   - ${pair.token0}/${pair.token1}`);
  });

  console.log("\n📋 检查的费用层级:", feeTiers.map(f => `${f} (${feeNames[f]})`).join(", "));
  console.log("\n" + "=".repeat(60));

  let totalPools = 0;
  const results = [];

  for (const pair of pairs) {
    const token0Addr = TOKENS[pair.token0];
    const token1Addr = TOKENS[pair.token1];

    if (!token0Addr || !token1Addr) {
      console.log(`\n⚠️  跳过 ${pair.token0}/${pair.token1} - 代币地址未找到`);
      continue;
    }

    console.log(`\n🔍 检查 ${pair.token0}/${pair.token1}:`);
    
    // Get token info
    let token0Symbol = pair.token0;
    let token1Symbol = pair.token1;
    try {
      const token0Contract = await hre.ethers.getContractAt(ERC20_ABI, token0Addr);
      const token1Contract = await hre.ethers.getContractAt(ERC20_ABI, token1Addr);
      token0Symbol = await token0Contract.symbol();
      token1Symbol = await token1Contract.symbol();
    } catch (e) {
      // Use default names if can't fetch
    }

    const pairPools = [];

    for (const fee of feeTiers) {
      try {
        // Sort tokens (token0 < token1)
        const [t0, t1] = token0Addr.toLowerCase() < token1Addr.toLowerCase() 
          ? [token0Addr, token1Addr] 
          : [token1Addr, token0Addr];
        
        const poolAddress = await factory.getPool(t0, t1, fee);
        
        if (poolAddress !== hre.ethers.ZeroAddress) {
          totalPools++;
          console.log(`   ✅ 费用层级 ${fee} (${feeNames[fee]}): 池子存在`);
          console.log(`      池子地址: ${poolAddress}`);
          
          // Try to get pool info
          try {
            const pool = await hre.ethers.getContractAt(POOL_ABI, poolAddress);
            const liquidity = await pool.liquidity();
            const slot0 = await pool.slot0();
            
            console.log(`      流动性: ${liquidity.toString()}`);
            console.log(`      当前价格: ${slot0.sqrtPriceX96.toString()}`);
            console.log(`      当前 Tick: ${slot0.tick.toString()}`);
            
            pairPools.push({
              fee,
              feeName: feeNames[fee],
              poolAddress,
              liquidity: liquidity.toString(),
              hasLiquidity: liquidity > 0n,
            });
          } catch (e) {
            console.log(`      ⚠️  无法获取池子详细信息: ${e.message}`);
            pairPools.push({
              fee,
              feeName: feeNames[fee],
              poolAddress,
              hasLiquidity: null,
            });
          }
        } else {
          console.log(`   ❌ 费用层级 ${fee} (${feeNames[fee]}): 池子不存在`);
        }
      } catch (error) {
        console.log(`   ❌ 费用层级 ${fee} (${feeNames[fee]}): 查询失败 - ${error.message}`);
      }
    }

    if (pairPools.length > 0) {
      results.push({
        pair: `${token0Symbol}/${token1Symbol}`,
        pools: pairPools,
      });
    }
  }

  // 总结
  console.log("\n" + "=".repeat(60));
  console.log("📊 检查结果总结");
  console.log("=".repeat(60));
  console.log(`\n总共找到 ${totalPools} 个池子:\n`);

  if (results.length === 0) {
    console.log("❌ 未找到任何池子");
    console.log("\n💡 可能的原因:");
    console.log("   1. PancakeSwap V3 测试网上流动性池较少");
    console.log("   2. 需要先创建池子");
    console.log("   3. 检查 Factory 地址是否正确");
  } else {
    results.forEach(result => {
      console.log(`\n${result.pair}:`);
      result.pools.forEach(pool => {
        const liquidityStatus = pool.hasLiquidity === null 
          ? "未知" 
          : pool.hasLiquidity 
            ? "✅ 有流动性" 
            : "⚠️  无流动性";
        console.log(`   ${pool.feeName} (${pool.fee}): ${pool.poolAddress}`);
        console.log(`      状态: ${liquidityStatus}`);
        if (pool.liquidity) {
          console.log(`      流动性: ${pool.liquidity}`);
        }
      });
    });
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
