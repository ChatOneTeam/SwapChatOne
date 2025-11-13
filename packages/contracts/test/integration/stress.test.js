const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Stress Tests", function () {
  let vault;
  let poolManager;
  let router;
  let token0;
  let token1;
  let owner;
  let users;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, ...users] = await ethers.getSigners();

    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();

    const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
    poolManager = await ChatOneSwapPoolManager.deploy(await vault.getAddress());
    await poolManager.waitForDeployment();

    await vault.setPoolManager(await poolManager.getAddress());

    const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
    router = await ChatOneSwapRouter.deploy(
      await poolManager.getAddress(),
      await vault.getAddress()
    );
    await router.waitForDeployment();

    await poolManager.setRouter(await router.getAddress());

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("10000000"));
    await token0.waitForDeployment();
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("10000000"));
    await token1.waitForDeployment();

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

    // Add large initial liquidity
    const liquidity0 = ethers.parseEther("100000");
    const liquidity1 = ethers.parseEther("100000");
    
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
  });

  describe("Stress: Sequential Swaps", function () {
    it("Should handle 100 sequential swaps", async function () {
      const swapAmount = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.approve(await router.getAddress(), swapAmount * 100n);

      const reservesBefore = await poolManager.getReserves(poolKey);

      // Perform 100 swaps (adjust slippage tolerance as reserves change)
      for (let i = 0; i < 100; i++) {
        // Calculate dynamic minimum output (allow 5% slippage)
        const quote = await router.getQuote(poolKey, tokenIn, tokenOut, swapAmount);
        const minOut = quote * 95n / 100n;
        
        await router.swap(
          poolKey,
          tokenIn,
          tokenOut,
          swapAmount,
          minOut,
          owner.address
        );
      }

      const reservesAfter = await poolManager.getReserves(poolKey);
      expect(reservesAfter[0]).to.be.gt(reservesBefore[0]);
      expect(reservesAfter[1]).to.be.lt(reservesBefore[1]);

      // Verify protocol fee accumulated
      const protocolFee = await vault.getProtocolFee(tokenIn);
      expect(protocolFee).to.be.gt(0);
    });
  });

  describe("Stress: Concurrent Liquidity Operations", function () {
    it("Should handle 50 concurrent liquidity operations", async function () {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("100");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      // Distribute tokens to users (use first 50 users or available users)
      const numUsers = Math.min(50, users.length);
      for (let i = 0; i < numUsers; i++) {
        await tokenForSorted0.transfer(users[i].address, amount0);
        await tokenForSorted1.transfer(users[i].address, amount1);
        await tokenForSorted0.connect(users[i]).approve(await router.getAddress(), amount0);
        await tokenForSorted1.connect(users[i]).approve(await router.getAddress(), amount1);
      }

      // Execute operations sequentially (simulating concurrent)
      const reservesBefore = await poolManager.getReserves(poolKey);
      for (let i = 0; i < numUsers; i++) {
        await router.connect(users[i]).addLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          amount0,
          amount1,
          0,
          0,
          users[i].address
        );
      }

      const pool = await poolManager.pools(poolKey);
      expect(pool.reserve0).to.be.gt(reservesBefore[0]);
      expect(pool.reserve1).to.be.gt(reservesBefore[1]);
    });
  });

  describe("Stress: Multiple Pools", function () {
    it("Should handle operations with multiple pools", async function () {
      // Create additional pools
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const pools = [];
      const poolKeys = [];

      for (let i = 0; i < 10; i++) {
        const newToken0 = await MockERC20.deploy(`Token${i}0`, `T${i}0`, ethers.parseEther("1000000"));
        await newToken0.waitForDeployment();
        const newToken1 = await MockERC20.deploy(`Token${i}1`, `T${i}1`, ethers.parseEther("1000000"));
        await newToken1.waitForDeployment();

        const fee = 3000;
        const tx = await poolManager.createPool(
          await newToken0.getAddress(),
          await newToken1.getAddress(),
          fee
        );
        const receipt = await tx.wait();
        let poolKey;
        for (const log of receipt.logs) {
          try {
            const parsed = poolManager.interface.parseLog(log);
            if (parsed && parsed.name === "PoolCreated") {
              poolKey = parsed.args.poolKey;
              break;
            }
          } catch {}
        }

        pools.push({ token0: newToken0, token1: newToken1, poolKey });
        poolKeys.push(poolKey);

        // Add liquidity to each pool
        const liquidity0 = ethers.parseEther("1000");
        const liquidity1 = ethers.parseEther("1000");
        await newToken0.approve(await router.getAddress(), liquidity0);
        await newToken1.approve(await router.getAddress(), liquidity1);

        const t0 = await newToken0.getAddress();
        const t1 = await newToken1.getAddress();
        const sorted = t0 < t1 ? [t0, t1] : [t1, t0];

        await router.addLiquidity(
          poolKey,
          sorted[0],
          sorted[1],
          liquidity0,
          liquidity1,
          0,
          0,
          owner.address
        );
      }

      // Verify all pools exist
      for (const poolKey of poolKeys) {
        expect(await poolManager.poolExists(poolKey)).to.be.true;
      }
    });
  });

  describe("Stress: Rapid Pause/Unpause Cycles", function () {
    it("Should handle rapid pause/unpause cycles", async function () {
      // Perform multiple pause/unpause cycles
      for (let i = 0; i < 10; i++) {
        await vault.pause();
        expect(await vault.paused()).to.be.true;

        await vault.unpause();
        expect(await vault.paused()).to.be.false;

        await poolManager.pause();
        expect(await poolManager.paused()).to.be.true;

        await poolManager.unpause();
        expect(await poolManager.paused()).to.be.false;

        await router.pause();
        expect(await router.paused()).to.be.true;

        await router.unpause();
        expect(await router.paused()).to.be.false;
      }

      // Verify contracts are unpaused and functional
      const swapAmount = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.approve(await router.getAddress(), swapAmount);
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );
    });
  });
});

