const hre = require("hardhat");
const { getContracts } = require("./test/utils/getContracts");

/**
 * 更新费用接收地址
 * 
 * 使用方法:
 * pnpm update-fee-recipient bsc-testnet
 * pnpm update-fee-recipient bsc
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🔧 更新费用接收地址");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log("\n网络:", network);

  // 新的费用接收地址
  const NEW_RECIPIENT = "0xeb643994f8802d6badc7e385f99b91d3203eb298";

  // 验证地址格式
  if (!hre.ethers.isAddress(NEW_RECIPIENT)) {
    console.error("\n❌ 错误: 无效的地址格式");
    process.exit(1);
  }

  try {
    // 加载合约
    const contracts = await getContracts(network);
    const feeManager = contracts.feeManager;
    const feeManagerAddress = contracts.addresses.feeManager;

    console.log("\n📋 FeeManager 信息:");
    console.log("   地址:", feeManagerAddress);

    // 获取当前信息
    const currentRecipient = await feeManager.feeRecipient();
    const owner = await feeManager.owner();
    
    console.log("\n📊 当前状态:");
    console.log("   当前费用接收地址:", currentRecipient);
    console.log("   合约所有者:", owner);

    // 检查是否为所有者
    const [signer] = await hre.ethers.getSigners();
    const signerAddress = await signer.getAddress();
    
    if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
      console.error("\n❌ 错误: 当前账户不是合约所有者");
      console.error("   当前账户:", signerAddress);
      console.error("   所有者:", owner);
      process.exit(1);
    }

    // 检查新地址是否与当前地址相同
    if (currentRecipient.toLowerCase() === NEW_RECIPIENT.toLowerCase()) {
      console.log("\n⚠️  新地址与当前地址相同，无需更新");
      process.exit(0);
    }

    // 确认操作
    console.log("\n⚠️  即将更新费用接收地址:");
    console.log("   从:", currentRecipient);
    console.log("   到:", NEW_RECIPIENT);
    console.log("\n   此操作需要合约所有者权限");
    console.log("   操作账户:", signerAddress);

    // 执行更新
    console.log("\n📝 执行更新...");
    const tx = await feeManager.setFeeRecipient(NEW_RECIPIENT);
    console.log("   交易哈希:", tx.hash);
    console.log("   等待确认...");
    
    const receipt = await tx.wait();
    console.log("   ✅ 交易已确认!");
    console.log("   区块:", receipt.blockNumber);
    console.log("   Gas 使用量:", receipt.gasUsed.toString());

    // 验证更新
    const updatedRecipient = await feeManager.feeRecipient();
    if (updatedRecipient.toLowerCase() === NEW_RECIPIENT.toLowerCase()) {
      console.log("\n✅ 费用接收地址已成功更新!");
      console.log("   新地址:", updatedRecipient);
    } else {
      console.log("\n⚠️  警告: 地址可能未正确更新");
      console.log("   预期:", NEW_RECIPIENT);
      console.log("   实际:", updatedRecipient);
    }

    // 查询更新事件（可选，失败不影响整体成功）
    try {
      const filter = feeManager.filters.FeeRecipientUpdated();
      const events = await feeManager.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
      if (events.length > 0) {
        const event = events[0];
        console.log("\n📋 更新事件:");
        console.log("   旧地址:", event.args.oldRecipient);
        console.log("   新地址:", event.args.newRecipient);
      }
    } catch (e) {
      // 查询事件失败不影响更新操作的成功
      console.log("\n⚠️  无法查询更新事件（RPC 限制），但更新已成功完成");
    }

  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    if (error.reason) {
      console.error("   原因:", error.reason);
    }
    if (error.data) {
      console.error("   错误数据:", error.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
