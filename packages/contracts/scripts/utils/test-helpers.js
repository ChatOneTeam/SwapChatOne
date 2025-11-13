const { ethers } = require("hardhat");

/**
 * 原子化功能模块 - 可复用的测试函数
 */

/**
 * 部署所有合约
 */
async function deployContracts() {
  const [owner] = await ethers.getSigners();
  
  const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
  const vault = await ChatOneSwapVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
  const poolManager = await ChatOneSwapPoolManager.deploy(vaultAddress);
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();

  const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
  const router = await ChatOneSwapRouter.deploy(poolManagerAddress, vaultAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();

  const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
  const timelock = await ChatOneSwapTimelock.deploy();
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();

  // 配置合约关系
  await vault.setPoolManager(poolManagerAddress);
  await vault.setTimelock(timelockAddress);
  await poolManager.setRouter(routerAddress);
  await poolManager.setTimelock(timelockAddress);
  await router.setTimelock(timelockAddress);

  return { 
    vault, 
    poolManager, 
    router, 
    timelock, 
    vaultAddress, 
    poolManagerAddress, 
    routerAddress, 
    timelockAddress 
  };
}

/**
 * 部署测试代币
 */
async function deployTokens(name1, symbol1, supply1, name2, symbol2, supply2) {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  const token1 = await MockERC20.deploy(name1, symbol1, supply1);
  await token1.waitForDeployment();
  const token1Address = await token1.getAddress();

  const token2 = await MockERC20.deploy(name2, symbol2, supply2);
  await token2.waitForDeployment();
  const token2Address = await token2.getAddress();

  return { token1, token2, token1Address, token2Address };
}

/**
 * 创建池子
 */
async function createPool(poolManager, token1Address, token2Address, fee) {
  const tx = await poolManager.createPool(token1Address, token2Address, fee);
  const receipt = await tx.wait();
  
  let poolKey;
  let sortedTokens;
  for (const log of receipt.logs) {
    try {
      const parsed = poolManager.interface.parseLog(log);
      if (parsed && parsed.name === "PoolCreated") {
        poolKey = parsed.args.poolKey;
        sortedTokens = [parsed.args.token0, parsed.args.token1];
        break;
      }
    } catch {}
  }
  
  if (!poolKey) {
    throw new Error("无法从事件中获取 poolKey");
  }
  
  return { poolKey, sortedTokens };
}

/**
 * 添加流动性
 */
async function addLiquidity(router, poolKey, sortedTokens, token1, token2, amount1, amount2, isToken1First, provider) {
  const routerAddress = await router.getAddress();
  
  if (isToken1First) {
    await token1.approve(routerAddress, amount1);
    await token2.approve(routerAddress, amount2);
    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      amount1,
      amount2,
      0,
      0,
      provider.address
    );
  } else {
    await token1.approve(routerAddress, amount1);
    await token2.approve(routerAddress, amount2);
    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      amount2,
      amount1,
      0,
      0,
      provider.address
    );
  }
}

/**
 * 执行交易
 */
async function executeSwap(router, poolKey, sortedTokens, tokenIn, tokenOut, amountIn, minOut, user, isToken1First) {
  const routerAddress = await router.getAddress();
  
  // 确定 token 合约
  const token1Address = sortedTokens[0];
  const token2Address = sortedTokens[1];
  
  // 获取正确的 token 合约实例
  const tokenInIsFirst = tokenIn.toLowerCase() === token1Address.toLowerCase();
  const tokenInContract = tokenInIsFirst 
    ? await ethers.getContractAt("MockERC20", tokenIn)
    : await ethers.getContractAt("MockERC20", tokenIn);
  
  // 授权
  await tokenInContract.connect(user).approve(routerAddress, amountIn);
  
  // 执行交易
  await router.connect(user).swap(
    poolKey,
    tokenIn,
    tokenOut,
    amountIn,
    minOut,
    user.address
  );
  
  // 返回交易结果（如果需要）
  return {
    success: true
  };
}

/**
 * 移除流动性
 */
async function removeLiquidity(router, poolKey, sortedTokens, liquidity, provider, token1, token2) {
  const balance1Before = await token1.balanceOf(provider.address);
  const balance2Before = await token2.balanceOf(provider.address);
  
  await router.connect(provider).removeLiquidity(
    poolKey,
    sortedTokens[0],
    sortedTokens[1],
    liquidity,
    0,
    0,
    provider.address
  );
  
  const balance1After = await token1.balanceOf(provider.address);
  const balance2After = await token2.balanceOf(provider.address);
  
  return {
    removed1: balance1After - balance1Before,
    removed2: balance2After - balance2Before
  };
}

module.exports = {
  deployContracts,
  deployTokens,
  createPool,
  addLiquidity,
  executeSwap,
  removeLiquidity
};
