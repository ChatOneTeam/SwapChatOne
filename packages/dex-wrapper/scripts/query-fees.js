const hre = require("hardhat");
const { formatEther } = require("ethers");
const { getContracts } = require("./test/utils/getContracts");

/**
 * 查询项目手续费收入（支持分批查询，避免 RPC 限制）
 */
async function main() {
  console.log("=".repeat(60));
  console.log("💰 查询项目手续费收入");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log("\n网络:", network);

  // 从环境变量或命令行参数获取查询范围（可选）
  // 支持方式：
  // 1. 环境变量: BLOCKS=500 pnpm query-fees bsc-testnet
  // 2. 环境变量: QUERY_ALL=true pnpm query-fees bsc-testnet
  // 3. 命令行参数（需要过滤 Hardhat 参数）
  const args = process.argv.slice(2).filter(arg => 
    !arg.startsWith("--network") && 
    !arg.startsWith("--show-stack-traces") &&
    !arg.startsWith("--config")
  );
  
  const queryAll = process.env.QUERY_ALL === "true" || 
                   process.env.QUERY_ALL === "1" ||
                   args.includes("--all") || 
                   args.includes("-a");
  
  const recentBlocks = process.env.BLOCKS 
    ? parseInt(process.env.BLOCKS)
    : args.find(arg => arg.startsWith("--blocks=")) 
      ? parseInt(args.find(arg => arg.startsWith("--blocks=")).split("=")[1])
      : 1000; // 默认查询最近 1000 个区块

  try {
    // 加载合约
    const contracts = await getContracts(network);
    const feeManager = contracts.feeManager;
    const feeManagerAddress = contracts.addresses.feeManager;

    console.log("\n📋 FeeManager 信息:");
    console.log("   地址:", feeManagerAddress);
    
    const currentRecipient = await feeManager.feeRecipient();
    const feeRate = await feeManager.feeRate();
    console.log("   当前费用接收地址:", currentRecipient);
    console.log("   费用率:", feeRate.toString(), "基点 (", (Number(feeRate) / 100).toFixed(2), "%)");

    // 查询 FeeCollected 事件
    console.log("\n📊 查询手续费收集事件...");
    
    // 获取当前区块
    const currentBlock = await hre.ethers.provider.getBlockNumber();
    console.log("   当前区块:", currentBlock);
    
    // 确定查询起始区块
    let fromBlock;
    if (queryAll) {
      // 查询所有历史记录（从合约部署区块开始）
      // 尝试获取合约创建交易的区块号
      try {
        // 使用一个较早的区块作为起点
        // BSC 测试网大约从 2021 年开始，区块号大约从 0 开始
        fromBlock = 0;
        console.log("   🔍 查询模式: 所有历史记录（从区块 0 开始）");
      } catch (e) {
        fromBlock = Math.max(0, currentBlock - 100000);
        console.log("   ⚠️  无法确定部署区块，查询最近 10 万区块");
      }
    } else {
      fromBlock = Math.max(0, currentBlock - recentBlocks);
      console.log(`   🔍 查询模式: 最近 ${recentBlocks} 个区块`);
    }
    
    console.log("   查询范围: 区块", fromBlock, "到", currentBlock);
    console.log("   ⏳ 开始分批查询（避免 RPC 限制）...\n");

    // 分批查询事件（每次查询 100 个区块，避免 RPC 限制）
    // 如果遇到限制，可以进一步减小批次大小
    const BATCH_SIZE = 100;
    const filter = feeManager.filters.FeeCollected();
    const allEvents = [];
    let queryCount = 0;
    let successCount = 0;
    let skipCount = 0;

    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += BATCH_SIZE) {
      const endBlock = Math.min(startBlock + BATCH_SIZE - 1, currentBlock);
      queryCount++;
      
      try {
        process.stdout.write(`   查询批次 ${queryCount}: 区块 ${startBlock} - ${endBlock}... `);
        const events = await feeManager.queryFilter(filter, startBlock, endBlock);
        allEvents.push(...events);
        successCount++;
        console.log(`✅ 找到 ${events.length} 条记录`);
        
        // 添加延迟，避免请求过快
        if (startBlock + BATCH_SIZE <= currentBlock) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        skipCount++;
        if (error.message.includes("limit exceeded") || error.message.includes("timeout")) {
          console.log(`⚠️  RPC 限制，跳过此批次`);
        } else {
          console.log(`❌ 错误: ${error.message}`);
        }
        // 继续查询下一批次
      }
    }

    console.log(`\n📊 查询完成:`);
    console.log(`   成功批次: ${successCount}/${queryCount}`);
    if (skipCount > 0) {
      console.log(`   跳过批次: ${skipCount}`);
    }

    console.log(`\n📈 手续费收集记录:`);
    console.log(`   总共找到 ${allEvents.length} 条记录\n`);

    if (allEvents.length === 0) {
      console.log("   ⚠️  暂无手续费收入记录");
      console.log("   💡 这可能是因为:");
      console.log("      - 还没有用户进行交换");
      console.log("      - 交换功能尚未在主网使用");
      console.log("      - 查询范围可能不包含相关区块");
    } else {
      // 按代币统计
      const tokenStats = {};
      let totalFees = 0n;
      
      // 获取代币信息
      const ERC20_ABI = [
        "function symbol() external view returns (string)",
        "function decimals() external view returns (uint8)",
      ];

      console.log("   📋 最近", Math.min(10, allEvents.length), "条记录:");
      console.log("   " + "-".repeat(58));
      
      // 显示最近的记录
      const recentEvents = allEvents.slice(-10).reverse();
      for (const event of recentEvents) {
        try {
          const block = await hre.ethers.provider.getBlock(event.blockNumber);
          const timestamp = new Date(block.timestamp * 1000).toLocaleString('zh-CN');
          const token = event.args.token;
          const amount = event.args.amount;
          const recipient = event.args.recipient;

          // 获取代币符号
          let tokenSymbol = token.slice(0, 10) + "...";
          try {
            const tokenContract = await hre.ethers.getContractAt(ERC20_ABI, token);
            tokenSymbol = await tokenContract.symbol();
          } catch (e) {
            // 如果无法获取，使用地址前10位
          }

          console.log(`   ${timestamp}`);
          console.log(`   代币: ${tokenSymbol} (${token})`);
          console.log(`   数量: ${formatEther(amount)} ${tokenSymbol}`);
          console.log(`   接收地址: ${recipient}`);
          console.log(`   区块: ${event.blockNumber}`);
          console.log(`   交易哈希: ${event.transactionHash}`);
          console.log("   " + "-".repeat(58));

          // 统计
          if (!tokenStats[token]) {
            tokenStats[token] = {
              symbol: tokenSymbol,
              total: 0n,
              count: 0,
            };
          }
          tokenStats[token].total += amount;
          tokenStats[token].count++;
          totalFees += amount;
        } catch (e) {
          // 忽略单个事件处理错误
          console.log(`   ⚠️  处理事件时出错: ${e.message}`);
        }
      }

      // 按代币汇总
      console.log("\n📊 按代币汇总:");
      for (const [token, stats] of Object.entries(tokenStats)) {
        console.log(`\n   ${stats.symbol} (${token}):`);
        console.log(`      总收集次数: ${stats.count}`);
        console.log(`      总金额: ${formatEther(stats.total)} ${stats.symbol}`);
      }

      console.log("\n💰 总收入统计:");
      console.log(`   总记录数: ${allEvents.length}`);
      console.log(`   总金额: ${formatEther(totalFees)} (所有代币)`);
      
      // 显示最早和最晚的记录
      if (allEvents.length > 0) {
        const firstEvent = allEvents[0];
        const lastEvent = allEvents[allEvents.length - 1];
        try {
          const firstBlock = await hre.ethers.provider.getBlock(firstEvent.blockNumber);
          const lastBlock = await hre.ethers.provider.getBlock(lastEvent.blockNumber);
          console.log(`\n📅 时间范围:`);
          console.log(`   最早记录: 区块 ${firstEvent.blockNumber} (${new Date(firstBlock.timestamp * 1000).toLocaleString('zh-CN')})`);
          console.log(`   最新记录: 区块 ${lastEvent.blockNumber} (${new Date(lastBlock.timestamp * 1000).toLocaleString('zh-CN')})`);
        } catch (e) {
          // 忽略错误
        }
      }
    }

    // 检查当前费用接收地址的余额
    console.log("\n💵 当前费用接收地址余额:");
    console.log("   地址:", currentRecipient);
    
    // 检查常见代币余额
    const commonTokens = {
      "BUSD": network === "bsc-testnet" 
        ? "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee"
        : "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      "WBNB": network === "bsc-testnet"
        ? "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"
        : "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    };

    const ERC20_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function symbol() external view returns (string)",
    ];

    for (const [symbol, address] of Object.entries(commonTokens)) {
      try {
        const token = await hre.ethers.getContractAt(ERC20_ABI, address);
        const balance = await token.balanceOf(currentRecipient);
        console.log(`   ${symbol}: ${formatEther(balance)}`);
      } catch (e) {
        // 忽略错误
      }
    }

    // BNB 余额
    const bnbBalance = await hre.ethers.provider.getBalance(currentRecipient);
    console.log(`   BNB: ${formatEther(bnbBalance)}`);

  } catch (error) {
    console.error("\n❌ 错误:", error.message);
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