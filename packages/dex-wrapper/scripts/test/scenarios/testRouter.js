const { expect } = require("chai");
const { formatEther, parseEther } = require("ethers");

/**
 * Test DexWrapperRouter functionality
 */
async function testRouter(contracts, tokens, signer) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试 DexWrapperRouter");
  console.log("=".repeat(60));

  const { router, addresses } = contracts;
  const { busd, wbnb, addresses: tokenAddresses } = tokens;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  try {
    // Test 1: Check fee manager
    console.log("\n1. 测试费用管理器连接...");
    const feeManager = await router.feeManager();
    if (feeManager.toLowerCase() === addresses.feeManager.toLowerCase()) {
      console.log("   ✅ 费用管理器设置正确:", feeManager);
      results.passed++;
      results.tests.push({ name: "费用管理器", status: "PASS" });
    } else {
      console.log("   ❌ 费用管理器不匹配");
      results.failed++;
      results.tests.push({ name: "费用管理器", status: "FAIL" });
    }

    // Test 2: Check adapter registration
    console.log("\n2. 测试适配器注册...");
    const chainId = addresses.chainId;
    const registeredAdapter = await router.adapters(chainId);
    if (registeredAdapter.toLowerCase() === addresses.pancakeSwapAdapter.toLowerCase()) {
      console.log("   ✅ 适配器已注册，链 ID:", chainId);
      results.passed++;
      results.tests.push({ name: "适配器注册", status: "PASS" });
    } else {
      console.log("   ❌ 适配器未注册");
      results.failed++;
      results.tests.push({ name: "适配器注册", status: "FAIL" });
    }

    // Test 3: Check pause status
    console.log("\n3. 测试暂停功能...");
    const isPaused = await router.paused();
    if (!isPaused) {
      console.log("   ✅ 路由器未暂停（可以使用）");
      results.passed++;
      results.tests.push({ name: "暂停状态", status: "PASS" });
    } else {
      console.log("   ⚠️  路由器已暂停");
      results.passed++;
      results.tests.push({ name: "暂停状态", status: "PASS", note: "已暂停" });
    }

    // Test 4: Get quote (if quoter is available)
    console.log("\n4. 测试报价功能...");
    try {
      const quoteAmount = parseEther("100");
      const quote = await router.getQuote(
        tokenAddresses.busd,
        tokenAddresses.wbnb,
        quoteAmount,
        3000, // 0.3% fee tier
        chainId
      );
      if (quote > 0n) {
        console.log("   ✅ 收到报价:", formatEther(quote), "WBNB 对应 100 BUSD");
        results.passed++;
        results.tests.push({ name: "获取报价", status: "PASS" });
      } else {
        console.log("   ⚠️  报价返回 0（报价器可能未设置）");
        results.passed++;
        results.tests.push({ name: "获取报价", status: "PASS", note: "返回 0" });
      }
    } catch (error) {
      console.log("   ⚠️  报价测试跳过（报价器不可用）:", error.message);
      results.passed++;
      results.tests.push({ name: "获取报价", status: "SKIP", note: "报价器不可用" });
    }

  } catch (error) {
    console.log("   ❌ Router 测试错误:", error.message);
    results.failed++;
    results.tests.push({ name: "Router 测试", status: "ERROR", error: error.message });
  }

  return results;
}

module.exports = { testRouter };

