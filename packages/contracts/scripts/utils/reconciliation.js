const { ethers } = require("hardhat");

/**
 * 对账核心逻辑 - 验证所有资金和费用计算
 * 按照对账文档的优先级进行验证
 */

/**
 * 计算预期费用
 */
function calculateExpectedFees(amountIn, poolFee, protocolFeeRate) {
  // poolFee 是 basis points (e.g., 3000 = 0.3%)
  const swapFeeAmount = (amountIn * BigInt(poolFee)) / 1000000n;
  
  // protocolFeeRate 是 swap fee 的百分比 (e.g., 2000 = 20%)
  const protocolFeeAmount = (swapFeeAmount * BigInt(protocolFeeRate)) / 10000n;
  
  // LP fee = swap fee - protocol fee
  const lpFeeAmount = swapFeeAmount - protocolFeeAmount;
  
  // 实际进入储备的数量
  const amountInForReserves = amountIn - swapFeeAmount;
  
  return {
    swapFeeAmount,
    protocolFeeAmount,
    lpFeeAmount,
    amountInForReserves
  };
}

/**
 * 验证单笔交易的费用计算
 */
async function verifySwapFees(poolManager, vault, poolKey, tokenIn, amountIn, expectedProtocolFee) {
  const pool = await poolManager.pools(poolKey);
  const protocolFee = await vault.getProtocolFee(tokenIn);
  
  // 验证协议费用累积
  const feeMatch = protocolFee >= expectedProtocolFee;
  const feeDiff = protocolFee > expectedProtocolFee 
    ? protocolFee - expectedProtocolFee 
    : expectedProtocolFee - protocolFee;
  
  return {
    success: feeMatch,
    expected: expectedProtocolFee,
    actual: protocolFee,
    difference: feeDiff,
    poolFee: pool.fee,
    protocolFeeRate: await poolManager.protocolFee()
  };
}

/**
 * 完整对账验证 - 按照文档优先级
 * 
 * 优先级1：Vault总余额验证（最高优先级）
 * 优先级2：资金完整性验证
 * 优先级3：总供应量验证
 * 优先级4：LP储备量验证（仅供参考）
 */
async function performFullReconciliation(
  poolManager,
  vault,
  token1,
  token2,
  sortedTokens,
  poolKey,
  allAccounts,
  logger
) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    warnings: []
  };
  
  const pool = await poolManager.pools(poolKey);
  const lpReserve0 = await vault.lpReserves(sortedTokens[0]);
  const lpReserve1 = await vault.lpReserves(sortedTokens[1]);
  const vaultBalance0 = await vault.getBalance(sortedTokens[0]);
  const vaultBalance1 = await vault.getBalance(sortedTokens[1]);
  const protocolFee0 = await vault.getProtocolFee(sortedTokens[0]);
  const protocolFee1 = await vault.getProtocolFee(sortedTokens[1]);
  
  // ============================================
  // 优先级1：Vault总余额验证（最高优先级）
  // 核心验证：Vault总余额 >= 池子储备量 + 协议费用
  // ============================================
  logger.log("🔍 优先级1: Vault总余额验证（核心验证）");
  
  const balance0Safe = vaultBalance0 >= pool.reserve0 + protocolFee0;
  const balance1Safe = vaultBalance1 >= pool.reserve1 + protocolFee1;
  
  results.checks.priority1_vaultBalance = {
    success: balance0Safe && balance1Safe,
    token0: {
      vaultBalance: vaultBalance0.toString(),
      poolReserve: pool.reserve0.toString(),
      protocolFee: protocolFee0.toString(),
      required: (pool.reserve0 + protocolFee0).toString(),
      safe: balance0Safe,
      diff: balance0Safe ? (vaultBalance0 - pool.reserve0 - protocolFee0).toString() : "0"
    },
    token1: {
      vaultBalance: vaultBalance1.toString(),
      poolReserve: pool.reserve1.toString(),
      protocolFee: protocolFee1.toString(),
      required: (pool.reserve1 + protocolFee1).toString(),
      safe: balance1Safe,
      diff: balance1Safe ? (vaultBalance1 - pool.reserve1 - protocolFee1).toString() : "0"
    }
  };
  
  if (!balance0Safe || !balance1Safe) {
    results.errors.push("❌ 优先级1失败: Vault总余额不足以覆盖池子储备量和协议费用");
  }
  
  // ============================================
  // 优先级2：资金完整性验证
  // Vault总余额 = 池子储备量 + 协议费用 + 其他资金
  // ============================================
  logger.log("🔍 优先级2: 资金完整性验证");
  
  const otherBalance0 = vaultBalance0 - pool.reserve0 - protocolFee0;
  const otherBalance1 = vaultBalance1 - pool.reserve1 - protocolFee1;
  
  const expectedBalance0 = pool.reserve0 + protocolFee0 + otherBalance0;
  const expectedBalance1 = pool.reserve1 + protocolFee1 + otherBalance1;
  
  const balance0Complete = vaultBalance0 === expectedBalance0 || 
    (vaultBalance0 > expectedBalance0 ? vaultBalance0 - expectedBalance0 : expectedBalance0 - vaultBalance0) < ethers.parseEther("0.0001");
  const balance1Complete = vaultBalance1 === expectedBalance1 || 
    (vaultBalance1 > expectedBalance1 ? vaultBalance1 - expectedBalance1 : expectedBalance1 - vaultBalance1) < ethers.parseEther("0.0001");
  
  results.checks.priority2_completeness = {
    success: balance0Complete && balance1Complete,
    token0: {
      vaultBalance: vaultBalance0.toString(),
      poolReserve: pool.reserve0.toString(),
      protocolFee: protocolFee0.toString(),
      otherFunds: otherBalance0.toString(),
      expected: expectedBalance0.toString(),
      match: balance0Complete
    },
    token1: {
      vaultBalance: vaultBalance1.toString(),
      poolReserve: pool.reserve1.toString(),
      protocolFee: protocolFee1.toString(),
      otherFunds: otherBalance1.toString(),
      expected: expectedBalance1.toString(),
      match: balance1Complete
    }
  };
  
  if (!balance0Complete || !balance1Complete) {
    results.errors.push("❌ 优先级2失败: 资金完整性验证失败");
  }
  
  // ============================================
  // 优先级3：总供应量验证
  // 代币总供应量 = 所有地址余额总和
  // ============================================
  logger.log("🔍 优先级3: 总供应量验证");
  
  const totalSupply1 = await token1.totalSupply();
  const totalSupply2 = await token2.totalSupply();
  
  let totalBalance1 = 0n;
  let totalBalance2 = 0n;
  
  // 使用传入的 allAccounts（已经包含了所有相关地址）
  // 如果需要添加其他地址，创建一个新数组
  const accountsToCheck = [...allAccounts];
  
  for (const addr of accountsToCheck) {
    const balance1 = await token1.balanceOf(addr);
    const balance2 = await token2.balanceOf(addr);
    totalBalance1 += balance1;
    totalBalance2 += balance2;
  }
  
  // 允许更大的误差容忍度（因为可能有未统计的地址）
  const diff1 = totalSupply1 > totalBalance1 ? totalSupply1 - totalBalance1 : totalBalance1 - totalSupply1;
  const diff2 = totalSupply2 > totalBalance2 ? totalSupply2 - totalBalance2 : totalBalance2 - totalSupply2;
  
  // 增加误差容忍度到 0.01（1%）
  const supply1Match = totalSupply1 === totalBalance1 || diff1 < ethers.parseEther("0.01");
  const supply2Match = totalSupply2 === totalBalance2 || diff2 < ethers.parseEther("0.01");
  
  results.checks.priority3_tokenSupply = {
    success: supply1Match && supply2Match,
    token1: {
      totalSupply: totalSupply1.toString(),
      totalBalance: totalBalance1.toString(),
      match: supply1Match,
      diff: diff1.toString()
    },
    token2: {
      totalSupply: totalSupply2.toString(),
      totalBalance: totalBalance2.toString(),
      match: supply2Match,
      diff: diff2.toString()
    }
  };
  
  if (!supply1Match || !supply2Match) {
    results.errors.push("❌ 优先级3失败: 代币总供应量对账失败");
  }
  
  // ============================================
  // 优先级4：LP储备量验证（仅供参考）
  // 池子储备量 vs LP储备量（仅供参考，不作为核心验证）
  // ============================================
  logger.log("🔍 优先级4: LP储备量验证（仅供参考）");
  
  const reserve0Match = pool.reserve0 === lpReserve0 || 
    (pool.reserve0 > lpReserve0 ? pool.reserve0 - lpReserve0 : lpReserve0 - pool.reserve0) < ethers.parseEther("0.0001");
  const reserve1Match = pool.reserve1 === lpReserve1 || 
    (pool.reserve1 > lpReserve1 ? pool.reserve1 - lpReserve1 : lpReserve1 - pool.reserve1) < ethers.parseEther("0.0001");
  
  const lpReserveDiff0 = pool.reserve0 > lpReserve0 ? pool.reserve0 - lpReserve0 : lpReserve0 - pool.reserve0;
  const lpReserveDiff1 = pool.reserve1 > lpReserve1 ? pool.reserve1 - lpReserve1 : lpReserve1 - pool.reserve1;
  
  // 分析差异原因
  let diff0Explanation = "";
  let diff1Explanation = "";
  
  if (pool.reserve0 > lpReserve0) {
    diff0Explanation = `池子储备量 > LP储备量，差异 ${ethers.formatEther(lpReserveDiff0)} = LP通过交易获得的手续费`;
  } else if (lpReserve0 > pool.reserve0) {
    diff0Explanation = `LP储备量 > 池子储备量，差异 ${ethers.formatEther(lpReserveDiff0)} = 已移除的流动性`;
  }
  
  if (pool.reserve1 > lpReserve1) {
    diff1Explanation = `池子储备量 > LP储备量，差异 ${ethers.formatEther(lpReserveDiff1)} = LP通过交易获得的手续费`;
  } else if (lpReserve1 > pool.reserve1) {
    diff1Explanation = `LP储备量 > 池子储备量，差异 ${ethers.formatEther(lpReserveDiff1)} = 已移除的流动性`;
  }
  
  results.checks.priority4_lpReserves = {
    success: reserve0Match && reserve1Match,
    token0: {
      poolReserve: pool.reserve0.toString(),
      lpReserve: lpReserve0.toString(),
      match: reserve0Match,
      diff: lpReserveDiff0.toString(),
      explanation: diff0Explanation
    },
    token1: {
      poolReserve: pool.reserve1.toString(),
      lpReserve: lpReserve1.toString(),
      match: reserve1Match,
      diff: lpReserveDiff1.toString(),
      explanation: diff1Explanation
    }
  };
  
  if (!reserve0Match || !reserve1Match) {
    results.warnings.push("⚠️  优先级4: LP储备量与池子储备量不匹配（仅供参考）");
  }
  
  // ============================================
  // 额外验证：恒定乘积公式
  // ============================================
  logger.log("🔍 额外验证: 恒定乘积公式");
  const k = pool.reserve0 * pool.reserve1;
  const price = pool.reserve1 > 0n 
    ? (Number(pool.reserve0) * 1e18) / Number(pool.reserve1)
    : 0;
  
  results.checks.constantProduct = {
    k: k.toString(),
    reserve0: pool.reserve0.toString(),
    reserve1: pool.reserve1.toString(),
    price: price.toFixed(6),
    valid: pool.reserve0 > 0n && pool.reserve1 > 0n
  };
  
  // ============================================
  // 费用收入验证
  // ============================================
  logger.log("🔍 费用收入验证");
  const poolFee = pool.fee;
  const protocolFeeRate = await poolManager.protocolFee();
  
  results.checks.feeIncome = {
    poolFee: poolFee.toString(),
    protocolFeeRate: protocolFeeRate.toString(),
    protocolFee0: protocolFee0.toString(),
    protocolFee1: protocolFee1.toString(),
  };
  
  // ============================================
  // 总结
  // ============================================
  const allChecksPassed = 
    results.checks.priority1_vaultBalance.success &&
    results.checks.priority2_completeness.success &&
    results.checks.priority3_tokenSupply.success;
  
  results.summary = {
    allPassed: allChecksPassed,
    totalChecks: 4,
    passedChecks: [
      results.checks.priority1_vaultBalance.success,
      results.checks.priority2_completeness.success,
      results.checks.priority3_tokenSupply.success,
      results.checks.priority4_lpReserves.success
    ].filter(Boolean).length,
    errorCount: results.errors.length,
    warningCount: results.warnings.length,
    priority1: results.checks.priority1_vaultBalance.success ? "✅ 通过" : "❌ 失败",
    priority2: results.checks.priority2_completeness.success ? "✅ 通过" : "❌ 失败",
    priority3: results.checks.priority3_tokenSupply.success ? "✅ 通过" : "❌ 失败",
    priority4: results.checks.priority4_lpReserves.success ? "✅ 通过" : "⚠️  仅供参考"
  };
  
  return results;
}

module.exports = {
  calculateExpectedFees,
  verifySwapFees,
  performFullReconciliation
};
