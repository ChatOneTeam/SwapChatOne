const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapPoolManager Advanced", function () {
  let vault;
  let poolManager;
  let token0;
  let token1;
  let owner;
  let user1;
  let user2;
  let router;
  let timelock;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

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
    await poolManager.setRouter(await router.getAddress());

    // Deploy Timelock
    const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
    timelock = await ChatOneSwapTimelock.deploy();
    await timelock.waitForDeployment();
    await poolManager.setTimelock(await timelock.getAddress());

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();
  });

  describe("Pool Creation Advanced Scenarios", function () {
    it("Should create pools with different fee tiers", async function () {
      const fees = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

      for (const fee of fees) {
        const tx = await poolManager.createPool(
          await token0.getAddress(),
          await token1.getAddress(),
          fee
        );
        const receipt = await tx.wait();
        
        // Extract poolKey from event
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

        expect(poolKey).to.not.be.undefined;
        const pool = await poolManager.pools(poolKey);
        expect(pool.fee).to.equal(fee);
        expect(pool.exists).to.be.true;
      }
    });

    it("Should create pool with tokens in different order (same poolKey)", async function () {
      const fee = 3000;
      
      // Create pool with token0, token1
      const tx1 = await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        fee
      );
      const receipt1 = await tx1.wait();
      let poolKey1;
      for (const log of receipt1.logs) {
        try {
          const parsed = poolManager.interface.parseLog(log);
          if (parsed && parsed.name === "PoolCreated") {
            poolKey1 = parsed.args.poolKey;
            break;
          }
        } catch {}
      }

      // Calculate poolKey for token1, token0 (should be same)
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sorted = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey2 = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sorted[0], sorted[1], fee])
      );

      // Should be the same pool key (tokens are sorted internally)
      expect(poolKey1).to.equal(poolKey2);
      
      // Try to create with reversed order should fail (pool already exists)
      await expect(
        poolManager.createPool(
          await token1.getAddress(),
          await token0.getAddress(),
          fee
        )
      ).to.be.revertedWith("Pool already exists");
    });

    it("Should revert if creating pool with same tokens and fee twice", async function () {
      const fee = 3000;
      await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        fee
      );

      await expect(
        poolManager.createPool(
          await token0.getAddress(),
          await token1.getAddress(),
          fee
        )
      ).to.be.revertedWith("Pool already exists");
    });
  });

  describe("Protocol Fee Advanced Scenarios", function () {
    it("Should set protocol fee to maximum (10000 = 100%)", async function () {
      await poolManager.setProtocolFee(10000);
      expect(await poolManager.protocolFee()).to.equal(10000);
    });

    it("Should set protocol fee to minimum (0 = 0%)", async function () {
      await poolManager.setProtocolFee(0);
      expect(await poolManager.protocolFee()).to.equal(0);
    });

    it("Should set protocol fee to various values", async function () {
      const fees = [0, 1000, 2000, 5000, 7500, 10000];
      
      for (const fee of fees) {
        await poolManager.setProtocolFee(fee);
        expect(await poolManager.protocolFee()).to.equal(fee);
      }
    });

    it("Should revert if protocol fee exceeds maximum", async function () {
      await expect(
        poolManager.setProtocolFee(10001)
      ).to.be.revertedWith("Protocol fee too high");
    });
  });

  describe("Liquidity Advanced Scenarios", function () {
    let poolKey;

    beforeEach(async function () {
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
            break;
          }
        } catch {}
      }
    });

    it("Should handle multiple LPs adding liquidity", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      // First LP
      await token0.transfer(user1.address, amount0);
      await token1.transfer(user1.address, amount1);
      await token0.connect(user1).approve(await router.getAddress(), amount0);
      await token1.connect(user1).approve(await router.getAddress(), amount1);

      await router.connect(user1).addLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        0,
        0,
        user1.address
      );

      // Second LP
      await token0.transfer(user2.address, amount0);
      await token1.transfer(user2.address, amount1);
      await token0.connect(user2).approve(await router.getAddress(), amount0);
      await token1.connect(user2).approve(await router.getAddress(), amount1);

      await router.connect(user2).addLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        0,
        0,
        user2.address
      );

      const pool = await poolManager.pools(poolKey);
      expect(pool.reserve0).to.equal(amount0 * 2n);
      expect(pool.reserve1).to.equal(amount1 * 2n);
    });

    it("Should correctly calculate LP shares proportionally", async function () {
      const amount0_1 = ethers.parseEther("1000");
      const amount1_1 = ethers.parseEther("1000");

      // First LP adds liquidity
      await token0.transfer(user1.address, amount0_1);
      await token1.transfer(user1.address, amount1_1);
      await token0.connect(user1).approve(await router.getAddress(), amount0_1);
      await token1.connect(user1).approve(await router.getAddress(), amount1_1);

      const tx1 = await router.connect(user1).addLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amount0_1,
        amount1_1,
        0,
        0,
        user1.address
      );
      const receipt1 = await tx1.wait();
      const liquidity1 = (await poolManager.pools(poolKey)).totalSupply;

      // Second LP adds half the amount
      const amount0_2 = ethers.parseEther("500");
      const amount1_2 = ethers.parseEther("500");
      await token0.transfer(user2.address, amount0_2);
      await token1.transfer(user2.address, amount1_2);
      await token0.connect(user2).approve(await router.getAddress(), amount0_2);
      await token1.connect(user2).approve(await router.getAddress(), amount1_2);

      await router.connect(user2).addLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amount0_2,
        amount1_2,
        0,
        0,
        user2.address
      );

      const liquidity2 = (await poolManager.pools(poolKey)).totalSupply;
      
      // Second LP should have approximately half the liquidity of first LP
      // (with some rounding differences)
      expect(liquidity2).to.be.greaterThan(liquidity1);
      expect(liquidity2).to.be.lessThan(liquidity1 * 2n);
    });
  });

  describe("State Consistency Scenarios", function () {
    let poolKey;

    beforeEach(async function () {
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
            break;
          }
        } catch {}
      }
    });

    it("Should maintain correct reserves after multiple operations", async function () {
      // Add liquidity
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");
      await token0.approve(await router.getAddress(), amount0);
      await token1.approve(await router.getAddress(), amount1);

      await router.addLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        0,
        0,
        owner.address
      );

      let pool = await poolManager.pools(poolKey);
      expect(pool.reserve0).to.equal(amount0);
      expect(pool.reserve1).to.equal(amount1);

      // Perform swap
      const swapAmount = ethers.parseEther("100");
      await token0.approve(await router.getAddress(), swapAmount);
      await router.swap(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );

      const poolAfterSwap = await poolManager.pools(poolKey);
      expect(poolAfterSwap.reserve0).to.be.greaterThan(amount0);
      expect(poolAfterSwap.reserve1).to.be.lessThan(amount1);

      // Remove liquidity
      const liquidity = poolAfterSwap.totalSupply / 2n;
      await router.removeLiquidity(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        liquidity,
        0,
        0,
        owner.address
      );

      const poolAfter = await poolManager.pools(poolKey);
      expect(poolAfter.reserve0).to.be.lessThan(poolAfterSwap.reserve0);
      expect(poolAfter.reserve1).to.be.lessThan(poolAfterSwap.reserve1);
    });
  });
});

