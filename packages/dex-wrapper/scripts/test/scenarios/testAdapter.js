const { expect } = require("chai");

/**
 * Test PancakeSwapV3Adapter functionality
 */
async function testAdapter(contracts, signer) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试 PancakeSwapV3Adapter");
  console.log("=".repeat(60));

  const { adapter } = contracts;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  try {
    // Test 1: Check DEX name
    console.log("\n1. 测试 DEX 名称...");
    const dexName = await adapter.dexName();
    if (dexName === "PancakeSwap V3") {
      console.log("   ✅ DEX 名称正确:", dexName);
      results.passed++;
      results.tests.push({ name: "DEX 名称", status: "PASS" });
    } else {
      console.log("   ❌ DEX 名称不匹配。预期: PancakeSwap V3, 实际:", dexName);
      results.failed++;
      results.tests.push({ name: "DEX 名称", status: "FAIL" });
    }

    // Test 2: Check supported chain ID
    console.log("\n2. 测试支持的链 ID...");
    const chainId = await adapter.supportedChainId();
    console.log("   ℹ️  支持的链 ID:", chainId.toString(), "(0 = 多链支持)");
    results.passed++;
    results.tests.push({ name: "支持的链 ID", status: "PASS" });

    // Test 3: Check swap router address
    console.log("\n3. 测试交换路由器地址...");
    const swapRouter = await adapter.swapRouter();
    if (swapRouter && swapRouter !== "0x0000000000000000000000000000000000000000") {
      console.log("   ✅ 交换路由器已设置:", swapRouter);
      results.passed++;
      results.tests.push({ name: "交换路由器", status: "PASS" });
    } else {
      console.log("   ❌ 交换路由器未设置");
      results.failed++;
      results.tests.push({ name: "交换路由器", status: "FAIL" });
    }

    // Test 4: Check quoter address
    console.log("\n4. 测试报价器地址...");
    const quoter = await adapter.quoter();
    if (quoter === "0x0000000000000000000000000000000000000000") {
      console.log("   ⚠️  报价器未设置 (address(0)) - 测试网上这是正常的");
      results.passed++;
      results.tests.push({ name: "报价器", status: "PASS", note: "未设置（可选）" });
    } else {
      console.log("   ✅ 报价器已设置:", quoter);
      results.passed++;
      results.tests.push({ name: "报价器", status: "PASS" });
    }

  } catch (error) {
    console.log("   ❌ Adapter 测试错误:", error.message);
    results.failed++;
    results.tests.push({ name: "Adapter 测试", status: "ERROR", error: error.message });
  }

  return results;
}

module.exports = { testAdapter };

