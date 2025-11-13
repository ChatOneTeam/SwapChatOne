const hre = require("hardhat");
const { ethers } = require("hardhat");
const path = require("path");

// 导入工具模块
const { deployContracts, deployTokens, createPool, addLiquidity, executeSwap } = require("../utils/test-helpers");
const { calculateExpectedFees, performFullReconciliation } = require("../utils/reconciliation");
const TestLogger = require("../utils/logger");
const { generateRandomPriceRatio, generateRandomTradingSequence } = require("../utils/random-data");

/**
 * 对账测试场景 - 重点验证收入计算
 * 支持本地测试网络和 BSC Testnet
 * 
 * 使用方法:
 *   # 本地网络
 *   npx hardhat run scripts/scenarios/reconciliation-test.js
 *   
 *   # BSC Testnet
 *   npx hardhat run scripts/scenarios/reconciliation-test.js --network bsc-testnet
 *   
 *   # 自定义参数
 *   npx hardhat run scripts/scenarios/reconciliation-test.js --users=20 --swaps=100
 */
async function main() {
  // 检测网络
  const network = await ethers.provider.getNetwork();
  const isTestnet = hre.network.name === "bsc-testnet" || network.chainId === 97n;
  const isLocal = hre.network.name === "hardhat" || hre.network.name === "localhost";
  
  // 解析参数：从 process.argv 中提取，跳过 Hardhat 的参数
  const args = process.argv.slice(2).filter(arg => 
    !arg.startsWith('--network') && 
    !arg.startsWith('--show-stack-traces') &&
    !arg.startsWith('--config')
  );
  
  const userCount = parseInt(args.find(arg => arg.startsWith('--users='))?.split('=')[1]) || 
                    parseInt(process.env.USERS) || 10;
  const swapCount = parseInt(args.find(arg => arg.startsWith('--swaps='))?.split('=')[1]) || 
                    parseInt(process.env.SWAPS) || 50;
  const verbose = !args.includes('--quiet') && process.env.QUIET !== "true";
  const reportFile = args.find(arg => arg.startsWith('--report='))?.split('=')[1] || 
                    process.env.REPORT || 
                    `reconciliation-report-${Date.now()}.json`;
  
  const logger = new TestLogger({ verbose, reportFile });
  
  logger.section("🔍 对账测试场景 - 收入验证");
  
  // 网络信息
  logger.log("🌐 网络信息:", {
    networkName: hre.network.name,
    chainId: network.chainId.toString(),
    isTestnet,
    isLocal
  });
  
  if (isTestnet) {
    logger.warn("⚠️  检测到 BSC Testnet，请确保账户有足够的 BNB 支付 gas 费用");
  }
  
  logger.log(`配置: ${userCount} 用户, 每个用户 ${swapCount} 笔交易`);
  
  // 获取签名者
  const signers = await ethers.getSigners();
  const [owner, ...users] = signers;
  const testUsers = users.slice(0, userCount);
  
  // 如果账户不足，使用 owner 账户
  while (testUsers.length < userCount) {
    testUsers.push(owner);
  }
  
  // 检查账户余额
  const balance = await ethers.provider.getBalance(owner.address);
  logger.log("💰 账户信息:", {
    owner: owner.address,
    balance: ethers.formatEther(balance) + (isTestnet ? " BNB" : " ETH"),
    userCount: testUsers.length
  });
  
  if (isTestnet && balance < ethers.parseEther("0.1")) {
    logger.warn("⚠️  账户余额可能不足，建议至少 0.1 BNB");
  }
  
  // ============================================
  // 步骤 1: 部署合约
  // ============================================
  logger.section("步骤 1: 部署合约");
  const contracts = await deployContracts();
  logger.success("所有合约部署完成", {
    vault: contracts.vaultAddress,
    poolManager: contracts.poolManagerAddress,
    router: contracts.routerAddress
  });
  
  // ============================================
  // 步骤 2: 部署测试代币
  // ============================================
  logger.section("步骤 2: 部署测试代币");
  const tokens = await deployTokens(
    "Token One", "TKN1", ethers.parseEther("10000000"),
    "Token Two", "TKN2", ethers.parseEther("10000000")
  );
  logger.success("测试代币部署完成");
  
  // 分发代币给用户
  const userTokenAmount = ethers.parseEther("100000");
  for (const user of testUsers) {
    await tokens.token1.transfer(user.address, userTokenAmount);
    await tokens.token2.transfer(user.address, userTokenAmount);
  }
  logger.success(`已向 ${testUsers.length} 个用户分发代币`);
  
  // ============================================
  // 步骤 3: 创建池子并初始化价格
  // ============================================
  logger.section("步骤 3: 创建池子并初始化价格");
  const fee = 3000; // 0.3%
  const poolInfo = await createPool(
    contracts.poolManager,
    tokens.token1Address,
    tokens.token2Address,
    fee
  );
  logger.success("池子创建成功", { poolKey: poolInfo.poolKey });
  
  // 随机生成初始价格
  const priceRatio = generateRandomPriceRatio();
  logger.log(`使用价格比例: ${priceRatio.name} (${priceRatio.ratio})`);
  
  const initialLiquidity1 = ethers.parseEther("100000");
  const initialLiquidity2 = ethers.parseEther(String(100000 * priceRatio.ratio));
  
  const isToken1First = poolInfo.sortedTokens[0].toLowerCase() === tokens.token1Address.toLowerCase();
  
  await addLiquidity(
    contracts.router,
    poolInfo.poolKey,
    poolInfo.sortedTokens,
    tokens.token1,
    tokens.token2,
    initialLiquidity1,
    initialLiquidity2,
    isToken1First,
    owner
  );
  
  const poolAfterInit = await contracts.poolManager.pools(poolInfo.poolKey);
  logger.success("初始流动性添加成功", {
    reserve0: ethers.formatEther(poolAfterInit.reserve0),
    reserve1: ethers.formatEther(poolAfterInit.reserve1)
  });
  
  // ============================================
  // 步骤 4: 执行多用户随机交易
  // ============================================
  logger.section("步骤 4: 执行多用户随机交易");
  
  // 生成随机交易序列
  const tradingSequence = generateRandomTradingSequence(
    testUsers.length,
    swapCount,
    poolAfterInit.reserve0,
    poolAfterInit.reserve1
  );
  
  logger.log(`生成 ${tradingSequence.length} 笔随机交易`);
  
  // 记录所有交易的费用
  const allFees = {
    totalSwapFees: { token0: 0n, token1: 0n },
    totalProtocolFees: { token0: 0n, token1: 0n },
    totalLpFees: { token0: 0n, token1: 0n }
  };
  
  // 执行交易
  for (let i = 0; i < tradingSequence.length; i++) {
    const trade = tradingSequence[i];
    const user = testUsers[trade.userIndex];
    
    const tokenIn = trade.direction 
      ? poolInfo.sortedTokens[0] 
      : poolInfo.sortedTokens[1];
    const tokenOut = trade.direction 
      ? poolInfo.sortedTokens[1] 
      : poolInfo.sortedTokens[0];
    
    const amountIn = BigInt(trade.amount);
    
    // 计算预期费用
    const protocolFeeRate = await contracts.poolManager.protocolFee();
    const expectedFees = calculateExpectedFees(amountIn, fee, protocolFeeRate);
    
    // 获取交易前状态
    const poolBefore = await contracts.poolManager.pools(poolInfo.poolKey);
    const protocolFeeBefore = await contracts.vault.getProtocolFee(tokenIn);
    
    try {
      // 获取 token 合约
      const tokenInContract = tokenIn.toLowerCase() === poolInfo.sortedTokens[0].toLowerCase()
        ? (isToken1First ? tokens.token1 : tokens.token2)
        : (isToken1First ? tokens.token2 : tokens.token1);
      
      // 检查用户余额，如果不足则调整交易金额
      const userBalance = await tokenInContract.balanceOf(user.address);
      let finalAmountIn = amountIn;
      
      if (userBalance < amountIn) {
        // 如果余额不足，使用用户余额的90%（留一些余量）
        finalAmountIn = (userBalance * 90n) / 100n;
        
        if (finalAmountIn < ethers.parseEther("0.001")) {
          // 如果调整后的金额太小，跳过这笔交易
          logger.warn(`交易 ${i + 1} 跳过: 用户余额太小`, {
            user: user.address,
            balance: ethers.formatEther(userBalance)
          });
          continue;
        }
        
        logger.warn(`交易 ${i + 1} 调整金额: 余额不足`, {
          original: ethers.formatEther(amountIn),
          adjusted: ethers.formatEther(finalAmountIn),
          balance: ethers.formatEther(userBalance)
        });
      }
      
      // 执行交易
      const quote = await contracts.router.getQuote(poolInfo.poolKey, tokenIn, tokenOut, finalAmountIn);
      const minOut = quote * 95n / 100n; // 5% 滑点容忍
      
      await tokenInContract.connect(user).approve(await contracts.router.getAddress(), finalAmountIn);
      
      await contracts.router.connect(user).swap(
        poolInfo.poolKey,
        tokenIn,
        tokenOut,
        finalAmountIn,
        minOut,
        user.address
      );
      
      // 获取交易后状态
      const poolAfter = await contracts.poolManager.pools(poolInfo.poolKey);
      const protocolFeeAfter = await contracts.vault.getProtocolFee(tokenIn);
      
      // 验证费用（使用实际交易金额）
      const actualProtocolFee = protocolFeeAfter - protocolFeeBefore;
      const expectedFees = calculateExpectedFees(finalAmountIn, fee, protocolFeeRate);
      const feeMatch = actualProtocolFee >= expectedFees.protocolFeeAmount * 99n / 100n && 
                       actualProtocolFee <= expectedFees.protocolFeeAmount * 101n / 100n;
      
      if (!feeMatch) {
        logger.error(`交易 ${i + 1} 费用不匹配`, {
          expected: expectedFees.protocolFeeAmount.toString(),
          actual: actualProtocolFee.toString(),
          diff: (actualProtocolFee > expectedFees.protocolFeeAmount 
            ? actualProtocolFee - expectedFees.protocolFeeAmount 
            : expectedFees.protocolFeeAmount - actualProtocolFee).toString()
        });
      }
      
      // 累计费用（使用实际交易金额）
      if (tokenIn === poolInfo.sortedTokens[0]) {
        allFees.totalSwapFees.token0 += expectedFees.swapFeeAmount;
        allFees.totalProtocolFees.token0 += expectedFees.protocolFeeAmount;
        allFees.totalLpFees.token0 += expectedFees.lpFeeAmount;
      } else {
        allFees.totalSwapFees.token1 += expectedFees.swapFeeAmount;
        allFees.totalProtocolFees.token1 += expectedFees.protocolFeeAmount;
        allFees.totalLpFees.token1 += expectedFees.lpFeeAmount;
      }
      
      if ((i + 1) % 10 === 0) {
        logger.log(`已完成 ${i + 1}/${tradingSequence.length} 笔交易`);
      }
    } catch (error) {
      logger.error(`交易 ${i + 1} 失败`, { error: error.message });
    }
  }
  
  logger.success("所有交易完成", {
    totalSwaps: tradingSequence.length,
    totalSwapFees: {
      token0: ethers.formatEther(allFees.totalSwapFees.token0),
      token1: ethers.formatEther(allFees.totalSwapFees.token1)
    },
    totalProtocolFees: {
      token0: ethers.formatEther(allFees.totalProtocolFees.token0),
      token1: ethers.formatEther(allFees.totalProtocolFees.token1)
    }
  });
  
  // ============================================
  // 步骤 5: 完整对账验证（按照文档优先级）
  // ============================================
  logger.section("步骤 5: 完整对账验证");
  
  const allAccounts = [
    owner.address,
    ...testUsers.map(u => u.address),
    contracts.vaultAddress,
    contracts.routerAddress,
    contracts.poolManagerAddress,
    contracts.timelockAddress
  ];
  
  const reconciliationResults = await performFullReconciliation(
    contracts.poolManager,
    contracts.vault,
    tokens.token1,
    tokens.token2,
    poolInfo.sortedTokens,
    poolInfo.poolKey,
    allAccounts,
    logger
  );
  
  // 输出对账结果
  logger.section("对账结果总结");
  
  if (reconciliationResults.summary.allPassed) {
    logger.success("✅ 所有对账检查通过！");
  } else {
    logger.error("❌ 部分对账检查失败", {
      passed: reconciliationResults.summary.passedChecks,
      total: reconciliationResults.summary.totalChecks,
      errors: reconciliationResults.errors
    });
  }
  
  // 详细费用验证
  logger.section("费用收入详细验证");
  const finalProtocolFee0 = await contracts.vault.getProtocolFee(poolInfo.sortedTokens[0]);
  const finalProtocolFee1 = await contracts.vault.getProtocolFee(poolInfo.sortedTokens[1]);
  
  logger.log("预期协议费用:", {
    token0: ethers.formatEther(allFees.totalProtocolFees.token0),
    token1: ethers.formatEther(allFees.totalProtocolFees.token1)
  });
  
  logger.log("实际协议费用:", {
    token0: ethers.formatEther(finalProtocolFee0),
    token1: ethers.formatEther(finalProtocolFee1)
  });
  
  const fee0Match = finalProtocolFee0 >= allFees.totalProtocolFees.token0 * 99n / 100n &&
                    finalProtocolFee0 <= allFees.totalProtocolFees.token0 * 101n / 100n;
  const fee1Match = finalProtocolFee1 >= allFees.totalProtocolFees.token1 * 99n / 100n &&
                    finalProtocolFee1 <= allFees.totalProtocolFees.token1 * 101n / 100n;
  
  if (fee0Match && fee1Match) {
    logger.success("✅ 协议费用计算正确！");
  } else {
    logger.error("❌ 协议费用计算不匹配！", {
      token0: {
        expected: allFees.totalProtocolFees.token0.toString(),
        actual: finalProtocolFee0.toString()
      },
      token1: {
        expected: allFees.totalProtocolFees.token1.toString(),
        actual: finalProtocolFee1.toString()
      }
    });
  }
  
  // 生成报告
  const report = logger.generateReport();
  report.reconciliation = reconciliationResults;
  report.feeAnalysis = {
    expected: allFees,
    actual: {
      protocolFee0: finalProtocolFee0.toString(),
      protocolFee1: finalProtocolFee1.toString()
    }
  };
  report.network = {
    name: hre.network.name,
    chainId: network.chainId.toString(),
    isTestnet
  };
  
  logger.section("测试完成");
  logger.log(`报告已保存: ${reportFile}`);
  
  // 如果有错误，退出码为 1
  if (reconciliationResults.errors.length > 0 || !fee0Match || !fee1Match) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 测试失败!");
    console.error(error);
    process.exit(1);
  });
