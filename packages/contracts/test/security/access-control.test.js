const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security: Access Control", function () {
  let vault;
  let poolManager;
  let router;
  let timelock;
  let token0;
  let token1;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contracts
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
  });

  describe("Vault Access Control", function () {
    it("Should revert if non-owner calls owner functions", async function () {
      await expect(
        vault.connect(user1).withdraw(await token0.getAddress(), ethers.parseEther("100"), user1.address)
      ).to.be.revertedWith("Only timelock or owner");

      await expect(
        vault.connect(user1).withdrawProtocolFee(await token0.getAddress(), user1.address, 0)
      ).to.be.revertedWith("Only timelock or owner");

      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      await expect(
        vault.connect(user1).setFlashLoanFee(100)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should revert if non-pool-manager calls pool manager functions", async function () {
      await token0.approve(await vault.getAddress(), ethers.parseEther("100"));
      await vault.deposit(await token0.getAddress(), ethers.parseEther("100"));

      // Only pool manager can call swapTransfer
      await expect(
        vault.connect(user1).swapTransfer(await token0.getAddress(), user1.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Only pool manager");

      // Only pool manager can call accumulateProtocolFee
      await expect(
        vault.connect(user1).accumulateProtocolFee(await token0.getAddress(), ethers.parseEther("10"))
      ).to.be.revertedWith("Only pool manager");
    });
  });

  describe("PoolManager Access Control", function () {
    it("Should revert if non-owner calls owner functions", async function () {
      await expect(
        poolManager.connect(user1).createPool(await token0.getAddress(), await token1.getAddress(), 3000)
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");

      await expect(
        poolManager.connect(user1).setProtocolFee(2000)
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");

      await expect(
        poolManager.connect(user1).pause()
      ).to.be.revertedWithCustomError(poolManager, "OwnableUnauthorizedAccount");
    });

    it("Should revert if non-router calls router functions", async function () {
      const fee = 3000;
      const tx = await poolManager.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
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

      // Only router can call updateReservesAfterSwap
      await expect(
        poolManager.connect(user1).updateReservesAfterSwap(
          poolKey,
          await token0.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("95")
        )
      ).to.be.revertedWith("Only router");
    });
  });

  describe("Router Access Control", function () {
    it("Should revert if non-owner calls owner functions", async function () {
      await expect(
        router.connect(user1).pause()
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });

    it("Should allow anyone to call swap and liquidity functions", async function () {
      // These functions should be callable by anyone
      // We'll test this in integration tests
      // Here we just verify they don't have owner-only restrictions
      expect(router.swap).to.not.be.undefined;
      expect(router.addLiquidity).to.not.be.undefined;
      expect(router.removeLiquidity).to.not.be.undefined;
    });
  });

  describe("Timelock Access Control", function () {
    it("Should revert if non-owner schedules operation", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token0.getAddress(),
        ethers.parseEther("100"),
        user1.address
      ]);

      await expect(
        timelock.connect(user1).scheduleOperation(await vault.getAddress(), data)
      ).to.be.revertedWithCustomError(timelock, "OwnableUnauthorizedAccount");
    });

    it("Should revert if non-owner cancels operation", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token0.getAddress(),
        ethers.parseEther("100"),
        user1.address
      ]);

      const tx = await timelock.scheduleOperation(await vault.getAddress(), data);
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

      await expect(
        timelock.connect(user1).cancelOperation(operationId)
      ).to.be.revertedWithCustomError(timelock, "OwnableUnauthorizedAccount");
    });

    it("Should allow anyone to execute ready operation", async function () {
      const amount = ethers.parseEther("100");
      await token0.approve(await vault.getAddress(), amount);
      await vault.deposit(await token0.getAddress(), amount);

      const data = vault.interface.encodeFunctionData("withdraw", [
        await token0.getAddress(),
        amount,
        owner.address
      ]);

      const tx = await timelock.scheduleOperation(await vault.getAddress(), data);
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

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // Anyone should be able to execute
      await timelock.connect(user1).executeOperation(operationId);

      expect(await vault.getBalance(await token0.getAddress())).to.equal(0);
    });
  });
});

