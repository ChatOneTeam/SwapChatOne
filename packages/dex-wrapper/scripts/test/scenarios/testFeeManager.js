const { expect } = require("chai");
const { formatEther, parseEther } = require("ethers");

/**
 * Test FeeManager functionality
 */
async function testFeeManager(contracts, signer) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试 FeeManager");
  console.log("=".repeat(60));

  const { feeManager } = contracts;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  try {
    // Test 1: Check fee rate
    console.log("\n1. 测试费用率...");
    const feeRate = await feeManager.feeRate();
    const expectedFeeRate = 10; // 0.1%
    if (feeRate.toString() === expectedFeeRate.toString()) {
      console.log("   ✅ 费用率正确:", feeRate.toString(), "基点");
      results.passed++;
      results.tests.push({ name: "费用率", status: "PASS" });
    } else {
      console.log("   ❌ 费用率不匹配。预期:", expectedFeeRate, "实际:", feeRate.toString());
      results.failed++;
      results.tests.push({ name: "费用率", status: "FAIL", error: "不匹配" });
    }

    // Test 2: Check fee recipient
    console.log("\n2. 测试费用接收地址...");
    const feeRecipient = await feeManager.feeRecipient();
    if (feeRecipient && feeRecipient !== "0x0000000000000000000000000000000000000000") {
      console.log("   ✅ 费用接收地址已设置:", feeRecipient);
      results.passed++;
      results.tests.push({ name: "费用接收地址", status: "PASS" });
    } else {
      console.log("   ❌ 费用接收地址未设置");
      results.failed++;
      results.tests.push({ name: "费用接收地址", status: "FAIL", error: "未设置" });
    }

    // Test 3: Calculate fee
    console.log("\n3. 测试费用计算...");
    const testAmount = parseEther("1000");
    const calculatedFee = await feeManager.calculateFee(testAmount);
    const expectedFee = parseEther("1"); // 0.1% of 1000 = 1
    if (calculatedFee.toString() === expectedFee.toString()) {
      console.log("   ✅ 费用计算正确:");
      console.log("      数量: 1000 代币");
      console.log("      费用: 1 代币 (0.1%)");
      results.passed++;
      results.tests.push({ name: "费用计算", status: "PASS" });
    } else {
      console.log("   ❌ 费用计算不匹配");
      console.log("      预期:", formatEther(expectedFee), "实际:", formatEther(calculatedFee));
      results.failed++;
      results.tests.push({ name: "费用计算", status: "FAIL", error: "不匹配" });
    }

    // Test 4: Test with zero amount
    console.log("\n4. 测试零数量...");
    const zeroFee = await feeManager.calculateFee(0);
    if (zeroFee.toString() === "0") {
      console.log("   ✅ 零数量返回零费用");
      results.passed++;
      results.tests.push({ name: "零数量", status: "PASS" });
    } else {
      console.log("   ❌ 零数量应返回零费用");
      results.failed++;
      results.tests.push({ name: "零数量", status: "FAIL" });
    }

  } catch (error) {
    console.log("   ❌ FeeManager 测试错误:", error.message);
    results.failed++;
    results.tests.push({ name: "FeeManager 测试", status: "ERROR", error: error.message });
  }

  return results;
}

module.exports = { testFeeManager };

