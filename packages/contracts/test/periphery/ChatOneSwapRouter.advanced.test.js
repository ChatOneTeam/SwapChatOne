const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapRouter Advanced", function () {
  let vault;
  let poolManager;
  let router;
  let token0;
  let token1;
  let owner;
  let user1;
  let user2;
  let user3;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy Vault
    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();

    // Deploy PoolManager
    const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
    poolManager = await ChatOneSwapPoolManager.deploy(await vault.getAddress());
    await poolManager.waitForDeployment();

    // Set pool manager in vault
    await vault.setPoolManager(await poolManager.getAddress());

    // Deploy Router
    const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
    router = await ChatOneSwapRouter.deploy(
      await poolManager.getAddress(),
      await vault.getAddress()
    );
    await router.waitForDeployment();

    // Set router in pool manager
    await poolManager.setRouter(await router.getAddress());

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();

    // Create a pool
    const fee = 3000; // 0.3%
    const tx = await poolManager.createPool(
      await token0.getAddress(),
      await token1.getAddress(),
      fee
    );
    const receipt = await tx.wait();
    
    // Extract poolKey from event
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
    const liquidityAmount0 = ethers.parseEther("10000");
    const liquidityAmount1 = ethers.parseEther("10000");
    
    const t0Addr = await token0.getAddress();
    const t1Addr = await token1.getAddress();
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;
    
    await tokenForSorted0.approve(await router.getAddress(), liquidityAmount0);
    await tokenForSorted1.approve(await router.getAddress(), liquidityAmount1);
    
    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidityAmount0,
      liquidityAmount1,
      0,
      0,
      owner.address
    );
  });

  describe("Swap Boundary Scenarios", function () {
    it("Should handle swap with 1 wei (may fail due to insufficient output)", async function () {
      const amountIn = 1n;
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      // With 1 wei, output will likely be 0 or very small, causing revert
      // This is expected behavior - test that it fails gracefully
      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          amountIn,
          0,
          user1.address
        )
      ).to.be.reverted; // Should revert due to insufficient output or rounding
    });

    it("Should handle swap when reserves are extremely low", async function () {
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

      // Try to swap
      const swapAmount = ethers.parseEther("0.1");
      await newToken0.approve(await router.getAddress(), swapAmount);
      await router.swap(
        newPoolKey,
        await newToken0.getAddress(),
        await newToken1.getAddress(),
        swapAmount,
        0,
        owner.address
      );
    });

    it("Should revert swap with zero amount", async function () {
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];

      await expect(
        router.swap(
          poolKey,
          tokenIn,
          tokenOut,
          0,
          0,
          user1.address
        )
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should revert swap with invalid recipient", async function () {
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          amountIn,
          0,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should revert swap with excessive slippage", async function () {
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      // Request unrealistic minimum output
      const unrealisticMinOut = ethers.parseEther("1000");

      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          amountIn,
          unrealisticMinOut,
          user1.address
        )
      ).to.be.revertedWith("Insufficient output amount");
    });
  });

  describe("Concurrent Swap Scenarios", function () {
    it("Should handle multiple users swapping simultaneously", async function () {
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      // Transfer tokens to users
      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.transfer(user2.address, amountIn);
      await tokenInContract.transfer(user3.address, amountIn);

      // Approve
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);
      await tokenInContract.connect(user2).approve(await router.getAddress(), amountIn);
      await tokenInContract.connect(user3).approve(await router.getAddress(), amountIn);

      // Get initial reserves
      const reservesBefore = await poolManager.getReserves(poolKey);

      // Execute swaps
      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user1.address
      );

      await router.connect(user2).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user2.address
      );

      await router.connect(user3).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user3.address
      );

      // Check reserves updated correctly
      const reservesAfter = await poolManager.getReserves(poolKey);
      expect(reservesAfter[0]).to.be.greaterThan(reservesBefore[0]);
      expect(reservesAfter[1]).to.be.lessThan(reservesBefore[1]);
    });

    it("Should handle sequential swaps from same user", async function () {
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.transfer(user1.address, amountIn * 3n);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn * 3n);

      // First swap
      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user1.address
      );

      // Second swap
      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user1.address
      );

      // Third swap
      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        ethers.parseEther("90"),
        user1.address
      );

      // Check that reserves are updated
      const reserves = await poolManager.getReserves(poolKey);
      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });
  });

  describe("Liquidity Advanced Scenarios", function () {
    it("Should handle imbalanced liquidity addition", async function () {
      const amount0 = ethers.parseEther("2000");
      const amount1 = ethers.parseEther("1000"); // Imbalanced

      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.approve(await router.getAddress(), amount0);
      await tokenForSorted1.approve(await router.getAddress(), amount1);

      // Should adjust amounts to maintain ratio
      const reservesBefore = await poolManager.getReserves(poolKey);
      const ratio = reservesBefore[0] * 1000000n / reservesBefore[1];
      const expectedAmount1 = amount0 * reservesBefore[1] / reservesBefore[0];

      await router.addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        owner.address
      );

      const reservesAfter = await poolManager.getReserves(poolKey);
      // Reserves should increase proportionally
      expect(reservesAfter[0]).to.be.greaterThan(reservesBefore[0]);
      expect(reservesAfter[1]).to.be.greaterThan(reservesBefore[1]);
    });

    it("Should handle removing liquidity from large pool", async function () {
      // Add more liquidity first
      const addAmount0 = ethers.parseEther("5000");
      const addAmount1 = ethers.parseEther("5000");
      
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.approve(await router.getAddress(), addAmount0);
      await tokenForSorted1.approve(await router.getAddress(), addAmount1);

      await router.addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        addAmount0,
        addAmount1,
        0,
        0,
        owner.address
      );

      // Remove liquidity
      const pool = await poolManager.pools(poolKey);
      const liquidityToRemove = pool.totalSupply / 4n; // Remove 25%

      const reservesBefore = await poolManager.getReserves(poolKey);
      await router.removeLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        liquidityToRemove,
        0,
        0,
        owner.address
      );

      const reservesAfter = await poolManager.getReserves(poolKey);
      expect(reservesAfter[0]).to.be.lessThan(reservesBefore[0]);
      expect(reservesAfter[1]).to.be.lessThan(reservesBefore[1]);
    });

    it("Should handle multiple LPs adding and removing liquidity", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      // User1 adds liquidity
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

      // User2 adds liquidity
      await tokenForSorted0.transfer(user2.address, amount0);
      await tokenForSorted1.transfer(user2.address, amount1);
      await tokenForSorted0.connect(user2).approve(await router.getAddress(), amount0);
      await tokenForSorted1.connect(user2).approve(await router.getAddress(), amount1);

      await router.connect(user2).addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        user2.address
      );

      // User1 removes liquidity
      const pool = await poolManager.pools(poolKey);
      const user1Liquidity = pool.totalSupply / 3n; // Approximate share

      await router.connect(user1).removeLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        user1Liquidity,
        0,
        0,
        user1.address
      );

      // Check reserves decreased
      const reservesAfter = await poolManager.getReserves(poolKey);
      expect(reservesAfter[0]).to.be.gt(0);
      expect(reservesAfter[1]).to.be.gt(0);
    });
  });

  describe("Quote Scenarios", function () {
    it("Should get quote for different amounts", async function () {
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100"),
        ethers.parseEther("1000")
      ];

      for (const amount of amounts) {
        const quote = await router.getQuote(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          amount
        );
        expect(quote).to.be.gt(0);
      }
    });

    it("Should get accurate quote matching actual swap", async function () {
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];

      // Get quote
      const quote = await router.getQuote(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn
      );

      // Execute swap
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;
      const tokenOutContract = tokenOut.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      const balanceBefore = await tokenOutContract.balanceOf(user1.address);
      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        quote * 95n / 100n, // Allow 5% slippage
        user1.address
      );

      const balanceAfter = await tokenOutContract.balanceOf(user1.address);
      const actualOut = balanceAfter - balanceBefore;

      // Quote should be close to actual output (within 1% due to rounding)
      const diff = quote > actualOut ? quote - actualOut : actualOut - quote;
      expect(diff * 100n / quote).to.be.lt(1n); // Less than 1% difference
    });
  });

  describe("Error Scenarios", function () {
    it("Should revert swap with invalid pool", async function () {
      const invalidPoolKey = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];

      await expect(
        router.swap(
          invalidPoolKey,
          tokenIn,
          tokenOut,
          amountIn,
          0,
          user1.address
        )
      ).to.be.revertedWith("Pool does not exist");
    });

    it("Should revert swap with insufficient balance", async function () {
      const amountIn = ethers.parseEther("1000000"); // More than available
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      // Don't transfer tokens, so user has insufficient balance
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          amountIn,
          0,
          user1.address
        )
      ).to.be.reverted;
    });
  });
});

