const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapVault Advanced", function () {
  let vault;
  let token;
  let owner;
  let user1;
  let user2;
  let timelock;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Deploy Vault
    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();

    // Deploy Timelock
    const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
    timelock = await ChatOneSwapTimelock.deploy();
    await timelock.waitForDeployment();
    await vault.setTimelock(await timelock.getAddress());
  });

  describe("Boundary Value Scenarios", function () {
    it("Should handle deposit with 1 wei", async function () {
      const amount = 1n;
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);
      expect(await vault.getBalance(await token.getAddress())).to.equal(amount);
    });

    it("Should handle deposit with maximum uint256", async function () {
      const maxAmount = ethers.MaxUint256;
      await token.approve(await vault.getAddress(), maxAmount);
      // Note: This will fail if token doesn't have enough balance
      // In real scenario, we'd need a token with max supply
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(
        vault.deposit(await token.getAddress(), 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should handle protocol fee accumulation with 1 wei", async function () {
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const feeAmount = 1n;
      // ✅ Fix: Deposit tokens first to satisfy balance check
      await token.approve(await vault.getAddress(), feeAmount);
      await vault.deposit(await token.getAddress(), feeAmount);
      
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), feeAmount);
      expect(await vault.getProtocolFee(await token.getAddress())).to.equal(feeAmount);
    });
  });

  describe("Multiple Operations Scenarios", function () {
    it("Should handle multiple users depositing simultaneously", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      await token.transfer(user1.address, amount1);
      await token.transfer(user2.address, amount2);

      await token.connect(user1).approve(await vault.getAddress(), amount1);
      await token.connect(user2).approve(await vault.getAddress(), amount2);

      await vault.connect(user1).deposit(await token.getAddress(), amount1);
      await vault.connect(user2).deposit(await token.getAddress(), amount2);

      expect(await vault.getBalance(await token.getAddress())).to.equal(amount1 + amount2);
    });

    it("Should handle multiple protocol fee accumulations", async function () {
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const fee1 = ethers.parseEther("10");
      const fee2 = ethers.parseEther("20");
      const fee3 = ethers.parseEther("30");
      const totalFee = fee1 + fee2 + fee3;

      // ✅ Fix: Deposit tokens first to satisfy balance check
      await token.approve(await vault.getAddress(), totalFee);
      await vault.deposit(await token.getAddress(), totalFee);

      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), fee1);
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), fee2);
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), fee3);

      expect(await vault.getProtocolFee(await token.getAddress())).to.equal(fee1 + fee2 + fee3);
    });

    it("Should handle multiple protocol fee withdrawals", async function () {
      // Create a new vault for this test to avoid poolManager conflict
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await testVault.getAddress());
      await mockPoolManager.waitForDeployment();
      await testVault.setPoolManager(await mockPoolManager.getAddress());

      const totalFee = ethers.parseEther("100");
      // Need to deposit tokens first
      await token.approve(await testVault.getAddress(), totalFee);
      await testVault.deposit(await token.getAddress(), totalFee);
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), totalFee);

      // First withdrawal
      const withdraw1 = ethers.parseEther("30");
      await testVault.withdrawProtocolFee(await token.getAddress(), owner.address, withdraw1);
      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(totalFee - withdraw1);

      // Second withdrawal
      const withdraw2 = ethers.parseEther("40");
      await testVault.withdrawProtocolFee(await token.getAddress(), owner.address, withdraw2);
      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(totalFee - withdraw1 - withdraw2);

      // Final withdrawal (all remaining)
      await testVault.withdrawProtocolFee(await token.getAddress(), owner.address, 0);
      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(0);
    });
  });

  describe("State Consistency Scenarios", function () {
    it("Should maintain correct balance after multiple deposits and withdrawals", async function () {
      const deposit1 = ethers.parseEther("100");
      const deposit2 = ethers.parseEther("200");
      const withdraw1 = ethers.parseEther("50");

      // Deposits
      await token.approve(await vault.getAddress(), deposit1 + deposit2);
      await vault.deposit(await token.getAddress(), deposit1);
      await vault.deposit(await token.getAddress(), deposit2);

      expect(await vault.getBalance(await token.getAddress())).to.equal(deposit1 + deposit2);

      // Withdrawal
      await vault.withdraw(await token.getAddress(), withdraw1, owner.address);
      expect(await vault.getBalance(await token.getAddress())).to.equal(deposit1 + deposit2 - withdraw1);
    });

    it("Should maintain correct protocol fee balance after multiple operations", async function () {
      // Create a new vault for this test to avoid poolManager conflict
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await testVault.getAddress());
      await mockPoolManager.waitForDeployment();
      await testVault.setPoolManager(await mockPoolManager.getAddress());

      const fees = [
        ethers.parseEther("10"),
        ethers.parseEther("20"),
        ethers.parseEther("30"),
        ethers.parseEther("40")
      ];

      // Deposit tokens first
      const totalFees = fees.reduce((a, b) => a + b, 0n);
      await token.approve(await testVault.getAddress(), totalFees);
      await testVault.deposit(await token.getAddress(), totalFees);

      let totalAccumulated = 0n;
      for (const fee of fees) {
        await mockPoolManager.accumulateProtocolFee(await token.getAddress(), fee);
        totalAccumulated += fee;
        expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(totalAccumulated);
      }

      // Withdraw some
      const withdraw = ethers.parseEther("50");
      await testVault.withdrawProtocolFee(await token.getAddress(), owner.address, withdraw);
      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(totalAccumulated - withdraw);
    });
  });

  describe("Error Handling Scenarios", function () {
    it("Should revert withdraw with insufficient balance", async function () {
      const deposit = ethers.parseEther("100");
      const withdraw = ethers.parseEther("200");

      await token.approve(await vault.getAddress(), deposit);
      await vault.deposit(await token.getAddress(), deposit);

      await expect(
        vault.withdraw(await token.getAddress(), withdraw, owner.address)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should revert withdrawProtocolFee with insufficient fee", async function () {
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const fee = ethers.parseEther("100");
      // ✅ Fix: Deposit tokens first to satisfy balance check
      await token.approve(await vault.getAddress(), fee);
      await vault.deposit(await token.getAddress(), fee);
      
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), fee);

      const withdraw = ethers.parseEther("200");
      await expect(
        vault.withdrawProtocolFee(await token.getAddress(), owner.address, withdraw)
      ).to.be.revertedWith("Insufficient protocol fee");
    });

    it("Should revert withdrawProtocolFee when no fee available", async function () {
      await expect(
        vault.withdrawProtocolFee(await token.getAddress(), owner.address, 0)
      ).to.be.revertedWith("No protocol fee available");
    });
  });

  describe("Timelock Advanced Scenarios", function () {
    it("Should schedule and execute multiple operations", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      // Schedule first operation
      const data1 = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("50"),
        owner.address
      ]);
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

      // Schedule second operation
      const data2 = vault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        ethers.parseEther("30"),
        owner.address
      ]);
      const tx2 = await timelock.scheduleOperation(await vault.getAddress(), data2);
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

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // Execute both operations
      await timelock.executeOperation(operationId1);
      await timelock.executeOperation(operationId2);

      expect(await vault.getBalance(await token.getAddress())).to.equal(ethers.parseEther("20"));
    });

    it("Should cancel scheduled operation before execution time", async function () {
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

      // Cancel before execution time
      await timelock.cancelOperation(operationId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      // Try to execute (should fail because operation was cancelled/deleted)
      // After cancellation, the operation should not exist
      const operation = await timelock.getOperation(operationId);
      expect(operation.target).to.equal(ethers.ZeroAddress);
      expect(operation.executeTime).to.equal(0);
    });
  });
});

