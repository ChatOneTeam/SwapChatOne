const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapPoolManager", function () {
  let vault;
  let poolManager;
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

    // Set pool manager in vault (must be done by owner)
    await vault.setPoolManager(await poolManager.getAddress());

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await poolManager.owner()).to.equal(owner.address);
    });

    it("Should set the vault address", async function () {
      expect(await poolManager.vault()).to.equal(await vault.getAddress());
    });
  });

  describe("Create Pool", function () {
    it("Should create a new pool", async function () {
      const fee = 3000; // 0.3%
      const tx = await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        fee
      );
      await tx.wait();

      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      expect(await poolManager.poolExists(poolKey)).to.be.true;
    });

    it("Should emit PoolCreated event", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      await expect(
        poolManager.createPool(t0, t1, fee)
      )
        .to.emit(poolManager, "PoolCreated")
        .withArgs(ethers.keccak256(ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])), sortedTokens[0], sortedTokens[1], fee);
    });

    it("Should revert if tokens are the same", async function () {
      await expect(
        poolManager.createPool(await token0.getAddress(), await token0.getAddress(), 3000)
      ).to.be.revertedWith("Same token");
    });

    it("Should revert if fee is invalid", async function () {
      await expect(
        poolManager.createPool(await token0.getAddress(), await token1.getAddress(), 0)
      ).to.be.revertedWith("Invalid fee");

      await expect(
        poolManager.createPool(await token0.getAddress(), await token1.getAddress(), 10001)
      ).to.be.revertedWith("Invalid fee");
    });

    it("Should revert if pool already exists", async function () {
      const fee = 3000;
      await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        fee
      );

      await expect(
        poolManager.createPool(await token0.getAddress(), await token1.getAddress(), fee)
      ).to.be.revertedWith("Pool already exists");
    });

    it("Should revert if non-owner tries to create pool", async function () {
      await expect(
        poolManager.connect(user1).createPool(
          await token0.getAddress(),
          await token1.getAddress(),
          3000
        )
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("Get Pool", function () {
    it("Should return correct pool information", async function () {
      const fee = 3000;
      await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        fee
      );

      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const [poolT0, poolT1, poolFee] = await poolManager.getPool(poolKey);
      expect(poolT0.toLowerCase()).to.equal(sortedTokens[0].toLowerCase());
      expect(poolT1.toLowerCase()).to.equal(sortedTokens[1].toLowerCase());
      expect(poolFee).to.equal(fee);
    });

    it("Should revert if pool does not exist", async function () {
      const fakePoolKey = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(
        poolManager.getPool(fakePoolKey)
      ).to.be.revertedWith("Pool does not exist");
    });
  });
});

