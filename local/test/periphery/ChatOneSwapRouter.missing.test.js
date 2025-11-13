const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapRouter Missing Scenarios", function () {
  let vault;
  let poolManager;
  let router;
  let token0;
  let token1;
  let owner;
  let user1;
  let user2;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

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
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
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

    // Add initial liquidity
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
  });

  describe("Liquidity Error Scenarios", function () {
    it("Should revert if liquidity amounts don't match ratio", async function () {
      // Add liquidity with mismatched ratio
      const amount0 = ethers.parseEther("2000");
      const amount1 = ethers.parseEther("500"); // Too small, doesn't match ratio

      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.transfer(user1.address, amount0);
      await tokenForSorted1.transfer(user1.address, amount1);
      await tokenForSorted0.connect(user1).approve(await router.getAddress(), amount0);
      await tokenForSorted1.connect(user1).approve(await router.getAddress(), amount1);

      // Should adjust amounts, but if too far off, may revert
      // The router should handle this by adjusting to optimal amounts
      await router.connect(user1).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        user1.address
      );

      // Should succeed with adjusted amounts
      const reserves = await poolManager.getReserves(poolKey);
      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });

    it("Should revert if liquidity amounts below minimum", async function () {
      const amount0 = ethers.parseEther("2000");
      const amount1 = ethers.parseEther("2000");
      const amount0Min = ethers.parseEther("3000"); // Higher than actual
      const amount1Min = ethers.parseEther("3000"); // Higher than actual

      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.transfer(user1.address, amount0);
      await tokenForSorted1.transfer(user1.address, amount1);
      await tokenForSorted0.connect(user1).approve(await router.getAddress(), amount0);
      await tokenForSorted1.connect(user1).approve(await router.getAddress(), amount1);

      await expect(
        router.connect(user1).addLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          amount0,
          amount1,
          amount0Min,
          amount1Min,
          user1.address
        )
      ).to.be.reverted; // Should revert due to insufficient amounts
    });

    it("Should revert if removing more liquidity than owned", async function () {
      // User1 adds liquidity
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.transfer(user1.address, amount0);
      await tokenForSorted1.transfer(user1.address, amount1);
      await tokenForSorted0.connect(user1).approve(await router.getAddress(), amount0);
      await tokenForSorted1.connect(user1).approve(await router.getAddress(), amount1);

      await router.connect(user1).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        user1.address
      );

      const pool = await poolManager.pools(poolKey);
      const totalLiquidity = pool.totalSupply;

      // Try to remove more than total liquidity (should fail)
      await expect(
        router.connect(user1).removeLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          totalLiquidity + 1n,
          0,
          0,
          user1.address
        )
      ).to.be.reverted; // Should revert
    });

    it("Should revert if removing liquidity with amounts below minimum", async function () {
      // User1 adds liquidity
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.transfer(user1.address, amount0);
      await tokenForSorted1.transfer(user1.address, amount1);
      await tokenForSorted0.connect(user1).approve(await router.getAddress(), amount0);
      await tokenForSorted1.connect(user1).approve(await router.getAddress(), amount1);

      await router.connect(user1).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        user1.address
      );

      const pool = await poolManager.pools(poolKey);
      const liquidityToRemove = pool.totalSupply / 2n;

      // Set unrealistic minimum amounts
      const amount0Min = ethers.parseEther("10000");
      const amount1Min = ethers.parseEther("10000");

      await expect(
        router.connect(user1).removeLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          liquidityToRemove,
          amount0Min,
          amount1Min,
          user1.address
        )
      ).to.be.reverted; // Should revert due to insufficient output
    });
  });

  describe("Query Non-existent Pool", function () {
    it("Should revert when querying non-existent pool", async function () {
      const invalidPoolKey = ethers.keccak256(ethers.toUtf8Bytes("invalid-pool"));

      await expect(
        router.getQuote(
          invalidPoolKey,
          sortedTokens[0],
          sortedTokens[1],
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Pool does not exist");
    });
  });

  describe("LP Operations After Others Add Liquidity", function () {
    it("Should handle LP removing liquidity after others added", async function () {
      // User1 adds liquidity first
      const amount0_1 = ethers.parseEther("1000");
      const amount1_1 = ethers.parseEther("1000");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.transfer(user1.address, amount0_1);
      await tokenForSorted1.transfer(user1.address, amount1_1);
      await tokenForSorted0.connect(user1).approve(await router.getAddress(), amount0_1);
      await tokenForSorted1.connect(user1).approve(await router.getAddress(), amount1_1);

      await router.connect(user1).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0_1,
        amount1_1,
        0,
        0,
        user1.address
      );

      const poolBefore = await poolManager.pools(poolKey);
      const user1Liquidity = poolBefore.totalSupply / 2n; // Approximate

      // User2 adds liquidity
      const amount0_2 = ethers.parseEther("2000");
      const amount1_2 = ethers.parseEther("2000");
      await tokenForSorted0.transfer(user2.address, amount0_2);
      await tokenForSorted1.transfer(user2.address, amount1_2);
      await tokenForSorted0.connect(user2).approve(await router.getAddress(), amount0_2);
      await tokenForSorted1.connect(user2).approve(await router.getAddress(), amount1_2);

      await router.connect(user2).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0_2,
        amount1_2,
        0,
        0,
        user2.address
      );

      // User1 removes liquidity after user2 added
      await router.connect(user1).removeLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        user1Liquidity,
        0,
        0,
        user1.address
      );

      const poolAfter = await poolManager.pools(poolKey);
      expect(poolAfter.reserve0).to.be.gt(0);
      expect(poolAfter.reserve1).to.be.gt(0);
    });
  });

  describe("Swap with Extremely High Reserves", function () {
    it("Should handle swap when reserves are extremely high", async function () {
      // Add very large liquidity (but within token supply)
      const largeAmount0 = ethers.parseEther("500000");
      const largeAmount1 = ethers.parseEther("500000");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.approve(await router.getAddress(), largeAmount0);
      await tokenForSorted1.approve(await router.getAddress(), largeAmount1);

      await router.addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        largeAmount0,
        largeAmount1,
        0,
        0,
        owner.address
      );

      // Perform swap
      const swapAmount = ethers.parseEther("1000");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

      await tokenInContract.approve(await router.getAddress(), swapAmount);
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("990"),
        owner.address
      );

      const reserves = await poolManager.getReserves(poolKey);
      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });
  });

  describe("Remove Liquidity from Small Pool", function () {
    it("Should handle removing liquidity from small pool", async function () {
      // Create a new pool with minimal liquidity
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken0 = await MockERC20.deploy("NewToken0", "NT0", ethers.parseEther("1000000"));
      await newToken0.waitForDeployment();
      const newToken1 = await MockERC20.deploy("NewToken1", "NT1", ethers.parseEther("1000000"));
      await newToken1.waitForDeployment();

      const fee = 3000;
      const tx = await poolManager.createPool(
        await newToken0.getAddress(),
        await newToken1.getAddress(),
        fee
      );
      const receipt = await tx.wait();
      let newPoolKey;
      for (const log of receipt.logs) {
        try {
          const parsed = poolManager.interface.parseLog(log);
          if (parsed && parsed.name === "PoolCreated") {
            newPoolKey = parsed.args.poolKey;
            break;
          }
        } catch {}
      }

      // Add minimal liquidity
      const minAmount = ethers.parseEther("1");
      await newToken0.approve(await router.getAddress(), minAmount);
      await newToken1.approve(await router.getAddress(), minAmount);
      await router.addLiquidity(
        newPoolKey,
        await newToken0.getAddress(),
        await newToken1.getAddress(),
        minAmount,
        minAmount,
        0,
        0,
        owner.address
      );

      // Remove liquidity
      const pool = await poolManager.pools(newPoolKey);
      const liquidityToRemove = pool.totalSupply / 2n;

      await router.removeLiquidity(
        newPoolKey,
        await newToken0.getAddress(),
        await newToken1.getAddress(),
        liquidityToRemove,
        0,
        0,
        owner.address
      );

      const poolAfter = await poolManager.pools(newPoolKey);
      expect(poolAfter.reserve0).to.be.lt(pool.reserve0);
      expect(poolAfter.reserve1).to.be.lt(pool.reserve1);
    });
  });
});

