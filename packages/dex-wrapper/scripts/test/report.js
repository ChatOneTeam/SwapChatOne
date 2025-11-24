/**
 * Generate test report
 */
function generateReport(allResults) {
  console.log("\n" + "=".repeat(60));
  console.log("📋 测试报告摘要");
  console.log("=".repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Map test suite names to Chinese
  const suiteNames = {
    "FeeManager": "FeeManager",
    "Adapter": "适配器",
    "Router": "路由器",
    "Swap": "交换",
  };

  for (const [testSuite, results] of Object.entries(allResults)) {
    totalPassed += results.passed || 0;
    totalFailed += results.failed || 0;
    totalSkipped += results.skipped || 0;

    const suiteName = suiteNames[testSuite] || testSuite;
    console.log(`\n${suiteName}:`);
    console.log(`  ✅ 通过: ${results.passed || 0}`);
    console.log(`  ❌ 失败: ${results.failed || 0}`);
    if (results.skipped) {
      console.log(`  ⏭️  跳过: ${results.skipped}`);
    }

    if (results.tests && results.tests.length > 0) {
      results.tests.forEach((test) => {
        const icon = test.status === "PASS" ? "✅" : test.status === "FAIL" ? "❌" : "⏭️";
        const statusText = test.status === "PASS" ? "通过" : test.status === "FAIL" ? "失败" : "跳过";
        console.log(`    ${icon} ${test.name}: ${statusText}`);
        if (test.error) {
          console.log(`       错误: ${test.error}`);
        }
        if (test.note) {
          console.log(`       备注: ${test.note}`);
        }
      });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("总体结果:");
  console.log(`  ✅ 总通过: ${totalPassed}`);
  console.log(`  ❌ 总失败: ${totalFailed}`);
  console.log(`  ⏭️  总跳过: ${totalSkipped}`);
  const successRate = totalPassed + totalFailed > 0 
    ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
    : "0.0";
  console.log(`  📊 成功率: ${successRate}%`);
  console.log("=".repeat(60));

  return {
    totalPassed,
    totalFailed,
    totalSkipped,
    successRate: totalPassed + totalFailed > 0 
      ? (totalPassed / (totalPassed + totalFailed)) * 100 
      : 0,
  };
}

module.exports = { generateReport };

