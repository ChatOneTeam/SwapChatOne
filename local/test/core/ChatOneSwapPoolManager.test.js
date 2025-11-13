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

  describe("Protocol Fee", function () {
    it("Should have default protocol fee of 20%", async function () {
      expect(await poolManager.protocolFee()).to.equal(2000); // 20%
    });

    it("Should allow owner to set protocol fee", async function () {
      await poolManager.setProtocolFee(3000); // 30%
      expect(await poolManager.protocolFee()).to.equal(3000);
    });

    it("Should revert if protocol fee is too high", async function () {
      await expect(
        poolManager.setProtocolFee(10001)
      ).to.be.revertedWith("Protocol fee too high");
    });

    it("Should revert if non-owner tries to set protocol fee", async function () {
      await expect(
        poolManager.connect(user1).setProtocolFee(3000)
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause the contract", async function () {
      await poolManager.pause();
      expect(await poolManager.paused()).to.be.true;
    });

    it("Should allow owner to unpause the contract", async function () {
      await poolManager.pause();
      await poolManager.unpause();
      expect(await poolManager.paused()).to.be.false;
    });

    it("Should revert transferOwnership when paused", async function () {
      await poolManager.pause();
      
      await expect(
        poolManager.transferOwnership(user1.address)
      ).to.be.revertedWithCustomError(poolManager, "EnforcedPause");
    });

    it("Should revert renounceOwnership when paused", async function () {
      await poolManager.pause();
      
      await expect(
        poolManager.renounceOwnership()
      ).to.be.revertedWithCustomError(poolManager, "EnforcedPause");
    });

    it("Should revert if non-owner tries to pause", async function () {
      await expect(
        poolManager.connect(user1).pause()
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("Timelock", function () {
    let timelock;

    beforeEach(async function () {
      const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
      timelock = await ChatOneSwapTimelock.deploy();
      await timelock.waitForDeployment();
      await poolManager.setTimelock(await timelock.getAddress());
      // Ensure contract is not paused
      if (await poolManager.paused()) {
        await poolManager.unpause();
      }
    });

    it("Should allow owner to set timelock", async function () {
      expect(await poolManager.timelock()).to.equal(await timelock.getAddress());
    });

    it("Should allow timelock to call transferOwnership", async function () {
      // Ensure contract is not paused before scheduling
      if (await poolManager.paused()) {
        await poolManager.unpause();
      }

      // Schedule operation through timelock
      const data = poolManager.interface.encodeFunctionData("transferOwnership", [user1.address]);
      
      const tx = await timelock.scheduleOperation(
        await poolManager.getAddress(),
        data
      );
      const receipt = await tx.wait();
      
      // Extract operationId from event
      let operationId;
      for (const log of receipt.logs) {
        try {
          const parsed = timelock.interface.parseLog(log);
          if (parsed && parsed.name === "OperationScheduled") {
            operationId = parsed.args.operationId;
            break;
          }
        } catch {
          // Continue
        }
      }
      
      expect(operationId).to.not.be.undefined;

      // Fast forward time (48 hours)
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // Ensure contract is still not paused before execution
      if (await poolManager.paused()) {
        await poolManager.unpause();
      }

      // Execute operation (must be unpaused)
      await timelock.executeOperation(operationId);

      expect(await poolManager.owner()).to.equal(user1.address);
    });
  });
});

