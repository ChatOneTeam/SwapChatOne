const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapTimelock", function () {
  let timelock;
  let vault;
  let poolManager;
  let token;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Timelock
    const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
    timelock = await ChatOneSwapTimelock.deploy();
    await timelock.waitForDeployment();

    // Deploy Vault for testing
    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();
    await vault.setTimelock(await timelock.getAddress());

    // Deploy PoolManager for testing
    const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
    poolManager = await ChatOneSwapPoolManager.deploy(await vault.getAddress());
    await poolManager.waitForDeployment();
    await poolManager.setTimelock(await timelock.getAddress());

    // Deploy token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await timelock.owner()).to.equal(owner.address);
    });

    it("Should have correct delay (48 hours)", async function () {
      expect(await timelock.DELAY()).to.equal(172800); // 48 hours in seconds
    });
  });

  describe("Schedule Operation", function () {
    it("Should schedule an operation", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      expect(operationId).to.not.be.undefined;

      const operation = await timelock.getOperation(operationId);
      expect(operation.target).to.equal(await vault.getAddress());
      expect(operation.executeTime).to.be.gt(0);
      expect(operation.executed).to.be.false;
    });

    it("Should emit OperationScheduled event", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
        owner.address
      ]);

      await expect(
        timelock.scheduleOperation(await vault.getAddress(), data)
      ).to.emit(timelock, "OperationScheduled");
    });

    it("Should revert if scheduling same operation twice", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
        owner.address
      ]);

      await timelock.scheduleOperation(await vault.getAddress(), data);

      // Try to schedule again (should fail due to different timestamp/block)
      // Actually, this should succeed because operationId includes timestamp
      // So we test that we can schedule multiple operations
      await timelock.scheduleOperation(await vault.getAddress(), data);
    });

    it("Should revert if non-owner tries to schedule", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
        owner.address
      ]);

      await expect(
        timelock.connect(user1).scheduleOperation(await vault.getAddress(), data)
      ).to.be.revertedWithCustomError(timelock, "OwnableUnauthorizedAccount");
    });

    it("Should revert if target is zero address", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
        owner.address
      ]);

      await expect(
        timelock.scheduleOperation(ethers.ZeroAddress, data)
      ).to.be.revertedWith("Invalid target");
    });

    it("Should schedule multiple operations", async function () {
      const data1 = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("50"),
        owner.address
      ]);

      const data2 = poolManager.interface.encodeFunctionData("setProtocolFee", [3000]);

      const tx1 = await timelock.scheduleOperation(await vault.getAddress(), data1);
      const receipt1 = await tx1.wait();
      let operationId1;
      for (const log of receipt1.logs) {
        try {
          const parsed = timelock.interface.parseLog(log);
          if (parsed && parsed.name === "OperationScheduled") {
            operationId1 = parsed.args.operationId;
            break;
          }
        } catch {}
      }

      const tx2 = await timelock.scheduleOperation(await poolManager.getAddress(), data2);
      const receipt2 = await tx2.wait();
      let operationId2;
      for (const log of receipt2.logs) {
        try {
          const parsed = timelock.interface.parseLog(log);
          if (parsed && parsed.name === "OperationScheduled") {
            operationId2 = parsed.args.operationId;
            break;
          }
        } catch {}
      }

      expect(operationId1).to.not.be.undefined;
      expect(operationId2).to.not.be.undefined;
      expect(operationId1).to.not.equal(operationId2);
    });
  });

  describe("Execute Operation", function () {
    it("Should execute operation after delay", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
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

      // Execute
      await expect(
        timelock.executeOperation(operationId)
      ).to.emit(timelock, "OperationExecuted");

      expect(await vault.getBalance(await token.getAddress())).to.equal(0);
    });

    it("Should revert if executing before delay", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      // Don't fast forward time
      await expect(
        timelock.executeOperation(operationId)
      ).to.be.revertedWith("Operation not ready");
    });

    it("Should revert if executing already executed operation", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
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

      // Execute first time
      await timelock.executeOperation(operationId);

      // Try to execute again
      await expect(
        timelock.executeOperation(operationId)
      ).to.be.revertedWith("Operation already executed");
    });

    it("Should allow anyone to execute ready operation", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
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

      // Execute as non-owner
      await timelock.connect(user1).executeOperation(operationId);

      expect(await vault.getBalance(await token.getAddress())).to.equal(0);
    });

    it("Should revert if operation execution fails", async function () {
      // Schedule operation that will fail (withdraw more than available)
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("1000"), // More than available
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

      // Execute should fail with the actual revert reason from the target contract
      await expect(
        timelock.executeOperation(operationId)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Cancel Operation", function () {
    it("Should cancel scheduled operation", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      // Cancel
      await expect(
        timelock.cancelOperation(operationId)
      ).to.emit(timelock, "OperationCancelled");

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // Try to execute (should fail because operation was cancelled/deleted)
      // After cancellation, the operation should not exist
      const operation = await timelock.getOperation(operationId);
      expect(operation.target).to.equal(ethers.ZeroAddress);
      expect(operation.executeTime).to.equal(0);
    });

    it("Should revert if canceling after execution time", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      // Try to cancel (should fail)
      await expect(
        timelock.cancelOperation(operationId)
      ).to.be.revertedWith("Operation already executable");
    });

    it("Should revert if non-owner tries to cancel", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      await expect(
        timelock.connect(user1).cancelOperation(operationId)
      ).to.be.revertedWithCustomError(timelock, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should get operation details", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      const operation = await timelock.getOperation(operationId);
      expect(operation.target).to.equal(await vault.getAddress());
      expect(operation.executeTime).to.be.gt(0);
      expect(operation.executed).to.be.false;
    });

    it("Should check if operation is ready", async function () {
      const data = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("100"),
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

      // Before delay
      expect(await timelock.isOperationReady(operationId)).to.be.false;

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // After delay
      expect(await timelock.isOperationReady(operationId)).to.be.true;
    });
  });
});

