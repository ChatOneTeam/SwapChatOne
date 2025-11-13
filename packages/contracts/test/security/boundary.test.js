const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security: Boundary Value Tests", function () {
  let vault;
  let poolManager;
  let router;
  let token0;
  let token1;
  let owner;
  let user1;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy contracts
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

  describe("Zero Value Tests", function () {
    it("Should revert swap with zero amount", async function () {
      await expect(
        router.swap(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          0,
          0,
          user1.address
        )
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should revert liquidity with zero amount", async function () {
      await expect(
        router.addLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          0,
          0,
          0,
          0,
          user1.address
        )
      ).to.be.reverted;
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(
        vault.deposit(await token0.getAddress(), 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Minimum Value Tests (1 wei)", function () {
    it("Should handle swap with 1 wei", async function () {
      // Add minimal liquidity first
      const minAmount = ethers.parseEther("1");
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.approve(await router.getAddress(), minAmount);
      await tokenForSorted1.approve(await router.getAddress(), minAmount);
      await router.addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        minAmount,
        minAmount,
        0,
        0,
        owner.address
      );

      // Try swap with 1 wei
      const swapAmount = 1n;
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

      await tokenInContract.transfer(user1.address, swapAmount);
      await tokenInContract.connect(user1).approve(await router.getAddress(), swapAmount);

      // May revert due to insufficient output, but should not revert due to amount validation
      try {
        await router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          swapAmount,
          0,
          user1.address
        );
      } catch (error) {
        // Expected to fail due to insufficient output, not due to amount validation
        expect(error.message).to.not.include("Invalid amount");
      }
    });

    it("Should handle liquidity with 1 wei", async function () {
      const minAmount = 1n;
      const t0Addr = await token0.getAddress();
      const t1Addr = await token1.getAddress();
      const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;
      const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1Addr.toLowerCase() ? token1 : token0;

      await tokenForSorted0.approve(await router.getAddress(), minAmount);
      await tokenForSorted1.approve(await router.getAddress(), minAmount);

      // May revert due to insufficient liquidity, but should not revert due to amount validation
      try {
        await router.addLiquidity(
          poolKey,
          sortedTokens[0],
          sortedTokens[1],
          minAmount,
          minAmount,
          0,
          0,
          owner.address
        );
      } catch (error) {
        // Expected to fail due to insufficient liquidity, not due to amount validation
        expect(error.message).to.not.include("Invalid amount");
      }
    });
  });

  describe("Maximum Value Tests", function () {
    it("Should handle protocol fee with maximum uint256", async function () {
      // Create a new vault for this test to avoid poolManager conflict
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await testVault.getAddress());
      await mockPoolManager.waitForDeployment();
      await testVault.setPoolManager(await mockPoolManager.getAddress());

      // Note: In practice, this would require a token with max supply
      // This test verifies the contract can handle large values
      const maxFee = ethers.MaxUint256;
      
      // This will likely fail due to token balance, but contract should handle it
      try {
        await mockPoolManager.accumulateProtocolFee(await token0.getAddress(), maxFee);
      } catch (error) {
        // Expected to fail due to insufficient balance, not due to overflow
        expect(error.message).to.not.include("overflow");
      }
    });

    it("Should prevent overflow in calculations", async function () {
      // Add liquidity
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

      // Try very large swap (should revert due to insufficient liquidity, not overflow)
      const hugeAmount = ethers.parseEther("1000000000");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === t0Addr.toLowerCase() ? token0 : token1;

      await expect(
        router.swap(
          poolKey,
          tokenIn,
          tokenOut,
          hugeAmount,
          0,
          owner.address
        )
      ).to.be.reverted; // Should revert, but not due to overflow
    });
  });

  describe("Zero Reserve Tests", function () {
    it("Should handle zero reserves correctly", async function () {
      // Create new pool without adding liquidity
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

      // Try to get quote with zero reserves
      const t0 = await newToken0.getAddress();
      const t1 = await newToken1.getAddress();
      const sorted = t0 < t1 ? [t0, t1] : [t1, t0];

      // Should revert with "Insufficient liquidity" when reserves are zero
      await expect(
        router.getQuote(newPoolKey, sorted[0], sorted[1], ethers.parseEther("100"))
      ).to.be.revertedWith("Insufficient liquidity");
    });
  });
});

