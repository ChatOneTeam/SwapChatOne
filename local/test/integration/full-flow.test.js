const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Full Flow Scenarios", function () {
  let vault;
  let poolManager;
  let router;
  let timelock;
  let token0;
  let token1;
  let owner;
  let user1;
  let user2;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy all contracts
    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();

    const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
    poolManager = await ChatOneSwapPoolManager.deploy(await vault.getAddress());
    await poolManager.waitForDeployment();

    const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
    router = await ChatOneSwapRouter.deploy(
      await poolManager.getAddress(),
      await vault.getAddress()
    );
    await router.waitForDeployment();

    const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
    timelock = await ChatOneSwapTimelock.deploy();
    await timelock.waitForDeployment();

    // Initialize contracts
    await vault.setPoolManager(await poolManager.getAddress());
    await poolManager.setRouter(await router.getAddress());
    await vault.setTimelock(await timelock.getAddress());
    await poolManager.setTimelock(await timelock.getAddress());
    await router.setTimelock(await timelock.getAddress());

    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();

    // Create pool
    const fee = 3000;
    const tx = await poolManager.createPool(
      await token0.getAddress(),
      await token1.getAddress(),
      fee
    );
    const receipt = await tx.wait();
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
  });

  it("Should complete full swap flow: deposit -> swap -> transfer", async function () {
    // 1. Add liquidity
    const liquidity0 = ethers.parseEther("10000");
    const liquidity1 = ethers.parseEther("10000");
    
    const t0Addr = await token0.getAddress();
    const t1Addr = await token1.getAddress();
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

    await tokenForSorted0.approve(await router.getAddress(), liquidity0);
    await tokenForSorted1.approve(await router.getAddress(), liquidity1);

    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidity0,
      liquidity1,
      0,
      0,
      owner.address
    );

    // 2. User deposits tokens to vault (via swap)
    const swapAmount = ethers.parseEther("100");
    const tokenIn = sortedTokens[0];
    const tokenOut = sortedTokens[1];
    const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenOutContract = tokenOut.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

    await tokenInContract.transfer(user1.address, swapAmount);
    await tokenInContract.connect(user1).approve(await router.getAddress(), swapAmount);

    const balanceBefore = await tokenOutContract.balanceOf(user1.address);
    const vaultBalanceBefore = await vault.getBalance(tokenIn);

    // 3. Execute swap
    await router.connect(user1).swap(
      poolKey,
      tokenIn,
      tokenOut,
      swapAmount,
      ethers.parseEther("90"),
      user1.address
    );

    // 4. Verify tokens transferred
    const balanceAfter = await tokenOutContract.balanceOf(user1.address);
    expect(balanceAfter).to.be.gt(balanceBefore);

    // 5. Verify vault balance updated
    const vaultBalanceAfter = await vault.getBalance(tokenIn);
    expect(vaultBalanceAfter).to.be.gt(vaultBalanceBefore);
  });

  it("Should complete full liquidity flow: add -> swap -> remove", async function () {
    // 1. Add liquidity
    const liquidity0 = ethers.parseEther("10000");
    const liquidity1 = ethers.parseEther("10000");
    
    const t0Addr = await token0.getAddress();
    const t1Addr = await token1.getAddress();
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

    await tokenForSorted0.approve(await router.getAddress(), liquidity0);
    await tokenForSorted1.approve(await router.getAddress(), liquidity1);

    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidity0,
      liquidity1,
      0,
      0,
      owner.address
    );

    const poolBefore = await poolManager.pools(poolKey);
    const liquidityBefore = poolBefore.totalSupply;

    // 2. Perform swap
    const swapAmount = ethers.parseEther("100");
    const tokenIn = sortedTokens[0];
    const tokenOut = sortedTokens[1];
    const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

    await tokenInContract.approve(await router.getAddress(), swapAmount);
    await router.swap(
      poolKey,
      tokenIn,
      tokenOut,
      swapAmount,
      ethers.parseEther("90"),
      owner.address
    );

    // 3. Remove liquidity
    const poolAfter = await poolManager.pools(poolKey);
    const liquidityToRemove = poolAfter.totalSupply / 2n;

    await router.removeLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidityToRemove,
      0,
      0,
      owner.address
    );

    // 4. Verify liquidity decreased
    const poolFinal = await poolManager.pools(poolKey);
    expect(poolFinal.totalSupply).to.be.lt(liquidityBefore);
  });

  it("Should complete protocol fee flow: accumulate -> withdraw", async function () {
    // 1. Add liquidity
    const liquidity0 = ethers.parseEther("10000");
    const liquidity1 = ethers.parseEther("10000");
    
    const t0Addr = await token0.getAddress();
    const t1Addr = await token1.getAddress();
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

    await tokenForSorted0.approve(await router.getAddress(), liquidity0);
    await tokenForSorted1.approve(await router.getAddress(), liquidity1);

    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidity0,
      liquidity1,
      0,
      0,
      owner.address
    );

    // 2. Perform multiple swaps to accumulate protocol fees
    const swapAmount = ethers.parseEther("100");
    const tokenIn = sortedTokens[0];
    const tokenOut = sortedTokens[1];
    const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

    await tokenInContract.approve(await router.getAddress(), swapAmount * 5n);

    for (let i = 0; i < 5; i++) {
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );
    }

    // 3. Check protocol fee accumulated
    const protocolFee = await vault.getProtocolFee(tokenIn);
    expect(protocolFee).to.be.gt(0);

    // 4. Withdraw protocol fee
    const balanceBefore = await tokenInContract.balanceOf(owner.address);
    await vault.withdrawProtocolFee(tokenIn, owner.address, 0);
    const balanceAfter = await tokenInContract.balanceOf(owner.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
    expect(await vault.getProtocolFee(tokenIn)).to.equal(0);
  });

  it("Should complete ownership transfer flow: schedule -> execute", async function () {
    // 1. Schedule ownership transfer
    const data = poolManager.interface.encodeFunctionData("transferOwnership", [user1.address]);
    const tx = await timelock.scheduleOperation(await poolManager.getAddress(), data);
    const receipt = await tx.wait();

    let operationId;
    for (const log of receipt.logs) {
      try {
        const parsed = timelock.interface.parseLog(log);
        if (parsed && parsed.name === "OperationScheduled") {
          operationId = parsed.args.operationId;
          break;
        }
      } catch {}
    }

    expect(operationId).to.not.be.undefined;
    expect(await poolManager.owner()).to.equal(owner.address);

    // 2. Fast forward time
    await ethers.provider.send("evm_increaseTime", [172800]);
    await ethers.provider.send("evm_mine", []);

    // 3. Execute ownership transfer
    await timelock.executeOperation(operationId);

    // 4. Verify ownership transferred
    expect(await poolManager.owner()).to.equal(user1.address);
  });

  it("Should handle complex multi-step operations", async function () {
    // 1. Add liquidity
    const liquidity0 = ethers.parseEther("10000");
    const liquidity1 = ethers.parseEther("10000");
    
    const t0Addr = await token0.getAddress();
    const t1Addr = await token1.getAddress();
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

    await tokenForSorted0.approve(await router.getAddress(), liquidity0);
    await tokenForSorted1.approve(await router.getAddress(), liquidity1);

    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidity0,
      liquidity1,
      0,
      0,
      owner.address
    );

    // 2. Multiple swaps
    const swapAmount = ethers.parseEther("100");
    const tokenIn = sortedTokens[0];
    const tokenOut = sortedTokens[1];
    const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

    await tokenInContract.approve(await router.getAddress(), swapAmount * 3n);

    await router.swap(poolKey, tokenIn, tokenOut, swapAmount, ethers.parseEther("90"), owner.address);
    await router.swap(poolKey, tokenIn, tokenOut, swapAmount, ethers.parseEther("90"), owner.address);
    await router.swap(poolKey, tokenIn, tokenOut, swapAmount, ethers.parseEther("90"), owner.address);

    // 3. Add more liquidity
    await tokenForSorted0.approve(await router.getAddress(), liquidity0);
    await tokenForSorted1.approve(await router.getAddress(), liquidity1);
    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidity0,
      liquidity1,
      0,
      0,
      owner.address
    );

    // 4. Remove some liquidity
    const pool = await poolManager.pools(poolKey);
    const liquidityToRemove = pool.totalSupply / 4n;
    await router.removeLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidityToRemove,
      0,
      0,
      owner.address
    );

    // 5. Verify final state
    const finalPool = await poolManager.pools(poolKey);
    expect(finalPool.reserve0).to.be.gt(0);
    expect(finalPool.reserve1).to.be.gt(0);
    expect(finalPool.totalSupply).to.be.gt(0);
  });
});

