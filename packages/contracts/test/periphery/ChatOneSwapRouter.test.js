const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapRouter", function () {
  let vault;
  let poolManager;
  let router;
  let token0;
  let token1;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy Vault
    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();

    // Deploy PoolManager
    const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
    poolManager = await ChatOneSwapPoolManager.deploy(await vault.getAddress());
    await poolManager.waitForDeployment();

    // Deploy Router
    const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
    router = await ChatOneSwapRouter.deploy(
      await poolManager.getAddress(),
      await vault.getAddress()
    );
    await router.waitForDeployment();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();

    // Create a pool
    const fee = 3000; // 0.3%
    await poolManager.createPool(
      await token0.getAddress(),
      await token1.getAddress(),
      fee
    );

    // Transfer tokens to vault for testing and approve router
    const amount = ethers.parseEther("10000");
    await token0.transfer(await vault.getAddress(), amount);
    await token1.transfer(await vault.getAddress(), amount);
    
    // Approve router to spend tokens from vault (in production, this would be handled differently)
    // Since vault is the owner of tokens, we need to approve from vault's address
    // This is a workaround - in production, vault would handle this internally
    const vaultAddress = await vault.getAddress();
    await token0.connect(owner).approve(await router.getAddress(), amount);
    await token1.connect(owner).approve(await router.getAddress(), amount);
  });

  describe("Deployment", function () {
    it("Should set the right pool manager", async function () {
      expect(await router.poolManager()).to.equal(await poolManager.getAddress());
    });

    it("Should set the right vault", async function () {
      expect(await router.vault()).to.equal(await vault.getAddress());
    });
  });

  describe("Get Quote", function () {
    it("Should return a quote for a swap", async function () {
      // Get the actual pool key from the pool manager
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      const poolKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [sortedTokens[0], sortedTokens[1], fee]
        )
      );

      const amountIn = ethers.parseEther("100");
      const quote = await router.getQuote(
        poolKey,
        t0,
        t1,
        amountIn
      );

      expect(quote).to.be.gt(0);
    });
  });

  describe("Swap", function () {
    it("Should execute a swap", async function () {
      const poolKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [await token0.getAddress(), await token1.getAddress(), 3000]
        )
      );

      const amountIn = ethers.parseEther("100");
      const amountOutMin = ethers.parseEther("90");

      // Approve router to spend tokens
      await token0.approve(await router.getAddress(), amountIn);
      
      // Transfer tokens to user for swap
      await token0.transfer(user1.address, amountIn);

      const balanceBefore = await token1.balanceOf(user1.address);

      await router.connect(user1).swap(
        poolKey,
        await token0.getAddress(),
        await token1.getAddress(),
        amountIn,
        amountOutMin,
        user1.address
      );

      const balanceAfter = await token1.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.be.gte(amountOutMin);
    });

    it("Should emit SwapExecuted event", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      const poolKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [sortedTokens[0], sortedTokens[1], fee]
        )
      );

      const amountIn = ethers.parseEther("100");
      await token0.transfer(user1.address, amountIn);
      await token0.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          t0,
          t1,
          amountIn,
          ethers.parseEther("90"),
          user1.address
        )
      )
        .to.emit(router, "SwapExecuted");
    });

    it("Should revert if output amount is less than minimum", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      const poolKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [sortedTokens[0], sortedTokens[1], fee]
        )
      );

      const amountIn = ethers.parseEther("100");
      await token0.transfer(user1.address, amountIn);
      await token0.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          t0,
          t1,
          amountIn,
          ethers.parseEther("1000"), // Unrealistic minimum
          user1.address
        )
      ).to.be.revertedWith("Insufficient output amount");
    });
  });
});

