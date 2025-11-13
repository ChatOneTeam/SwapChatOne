/**
 * 随机数据生成器
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 生成随机价格比例
 */
function generateRandomPriceRatio() {
  const ratios = [
    { ratio: 1, name: "1:1" },
    { ratio: 1.5, name: "1:1.5" },
    { ratio: 2, name: "1:2" },
    { ratio: 0.5, name: "1:0.5" },
    { ratio: 10, name: "1:10" },
    { ratio: 0.1, name: "1:0.1" },
    { ratio: randomFloat(0.1, 10), name: "随机比例" }
  ];
  
  return ratios[randomInt(0, ratios.length - 1)];
}

/**
 * 生成随机交易金额
 */
function generateRandomSwapAmount(minPercent = 0.01, maxPercent = 0.1) {
  return {
    minPercent,
    maxPercent,
    generate: (reserve) => {
      const percent = randomFloat(minPercent, maxPercent);
      return BigInt(Math.floor(Number(reserve) * percent));
    }
  };
}

/**
 * 生成随机用户交易序列
 */
function generateRandomTradingSequence(userCount, swapCountPerUser, reserve0, reserve1) {
  const sequence = [];
  const swapAmountGen = generateRandomSwapAmount(0.01, 0.1);
  
  for (let i = 0; i < userCount; i++) {
    for (let j = 0; j < swapCountPerUser; j++) {
      const direction = Math.random() > 0.5; // true = token0 -> token1
      const reserve = direction ? reserve0 : reserve1;
      const amount = swapAmountGen.generate(reserve);
      
      // 确保金额不会太大（限制为储备量的10%，避免余额不足）
      const maxAmount = reserve / 10n;
      const finalAmount = amount > maxAmount ? maxAmount : amount;
      
      sequence.push({
        userIndex: i,
        direction,
        amount: finalAmount.toString()
      });
    }
  }
  
  // 随机打乱顺序
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  
  return sequence;
}

/**
 * 生成随机用户交易序列 - 改进版（基于用户实际余额）
 */
async function generateRandomTradingSequenceWithBalances(
  users,
  tokens,
  sortedTokens,
  isToken1First,
  swapCountPerUser,
  poolManager,
  poolKey
) {
  const sequence = [];
  
  // 为每个用户生成交易序列
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // 获取用户当前余额
    const token1Contract = isToken1First ? tokens.token1 : tokens.token2;
    const token2Contract = isToken1First ? tokens.token2 : tokens.token1;
    
    const balance1 = await token1Contract.balanceOf(user.address);
    const balance2 = await token2Contract.balanceOf(user.address);
    
    // 获取当前池子储备量
    const pool = await poolManager.pools(poolKey);
    const reserve0 = pool.reserve0;
    const reserve1 = pool.reserve1;
    
    // 为每个用户生成交易
    for (let j = 0; j < swapCountPerUser; j++) {
      // 随机选择交易方向
      const direction = Math.random() > 0.5; // true = token0 -> token1
      
      // 根据方向选择对应的余额和储备量
      let userBalance, reserve;
      if (direction) {
        // token0 -> token1
        userBalance = sortedTokens[0].toLowerCase() === token1Contract.target.toLowerCase() 
          ? balance1 : balance2;
        reserve = reserve0;
      } else {
        // token1 -> token0
        userBalance = sortedTokens[1].toLowerCase() === token1Contract.target.toLowerCase() 
          ? balance1 : balance2;
        reserve = reserve1;
      }
      
      // 生成交易金额：用户余额的 1%-5%（确保不会用完）
      const minPercent = 0.01;
      const maxPercent = 0.05;
      const percent = randomFloat(minPercent, maxPercent);
      const amount = (userBalance * BigInt(Math.floor(percent * 100))) / 100n;
      
      // 确保金额不会超过用户余额的90%
      const maxAmount = (userBalance * 90n) / 100n;
      const finalAmount = amount > maxAmount ? maxAmount : amount;
      
      // 确保金额不会超过储备量的10%（避免价格影响太大）
      const maxReserveAmount = reserve / 10n;
      const safeAmount = finalAmount > maxReserveAmount ? maxReserveAmount : finalAmount;
      
      // 最小金额检查
      if (safeAmount < ethers.parseEther("0.001")) {
        continue; // 跳过太小的交易
      }
      
      sequence.push({
        userIndex: i,
        direction,
        amount: safeAmount.toString()
      });
    }
  }
  
  // 随机打乱顺序
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  
  return sequence;
}

module.exports = {
  randomInt,
  randomFloat,
  generateRandomPriceRatio,
  generateRandomSwapAmount,
  generateRandomTradingSequence,
  generateRandomTradingSequenceWithBalances // 新增
};
