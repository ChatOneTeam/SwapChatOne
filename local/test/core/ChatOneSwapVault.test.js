const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapVault", function () {
  let vault;
  let token;
  let owner;
  let user1;
  let user2;

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
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should have initial flash loan fee of 9 basis points", async function () {
      expect(await vault.flashLoanFee()).to.equal(9);
    });
  });

  describe("Deposit", function () {
    it("Should allow users to deposit tokens", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      expect(await vault.getBalance(await token.getAddress())).to.equal(amount);
    });

    it("Should emit Deposit event", async function () {
      const amount = ethers.parseEther("100");
      await token.transfer(user1.address, amount);
      await token.connect(user1).approve(await vault.getAddress(), amount);
      await expect(vault.connect(user1).deposit(await token.getAddress(), amount))
        .to.emit(vault, "Deposit")
        .withArgs(await token.getAddress(), user1.address, amount);
    });

    it("Should revert if depositing zero amount", async function () {
      await expect(
        vault.deposit(await token.getAddress(), 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if depositing to zero address", async function () {
      await expect(
        vault.deposit(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("Invalid token");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);
    });

    it("Should allow owner to withdraw tokens", async function () {
      const amount = ethers.parseEther("50");
      await vault.withdraw(await token.getAddress(), amount, user1.address);
      
      expect(await vault.getBalance(await token.getAddress())).to.equal(ethers.parseEther("50"));
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit Withdraw event", async function () {
      const amount = ethers.parseEther("50");
      await expect(vault.withdraw(await token.getAddress(), amount, user1.address))
        .to.emit(vault, "Withdraw")
        .withArgs(await token.getAddress(), user1.address, amount);
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        vault.connect(user1).withdraw(await token.getAddress(), ethers.parseEther("50"), user1.address)
      ).to.be.revertedWith("Only timelock or owner");
    });

    it("Should revert if withdrawing more than balance", async function () {
      await expect(
        vault.withdraw(await token.getAddress(), ethers.parseEther("200"), user1.address)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Flash Loan Fee", function () {
    it("Should allow owner to set flash loan fee", async function () {
      await vault.setFlashLoanFee(10);
      expect(await vault.flashLoanFee()).to.equal(10);
    });

    it("Should revert if fee is too high", async function () {
      await expect(
        vault.setFlashLoanFee(1001)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should revert if non-owner tries to set fee", async function () {
      await expect(
        vault.connect(user1).setFlashLoanFee(10)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Protocol Fee", function () {
    it("Should accumulate protocol fee", async function () {
      // Create a new vault for this test to avoid poolManager conflict
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const amount = ethers.parseEther("100");
      await token.approve(await testVault.getAddress(), amount);
      await testVault.deposit(await token.getAddress(), amount);

      // Use MockPoolManager to accumulate protocol fee
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await testVault.getAddress());
      await mockPoolManager.waitForDeployment();
      await testVault.setPoolManager(await mockPoolManager.getAddress());

      const feeAmount = ethers.parseEther("10");
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), feeAmount);

      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(feeAmount);
    });

    it("Should allow owner to withdraw protocol fee", async function () {
      // Create a new vault for this test
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const amount = ethers.parseEther("100");
      await token.approve(await testVault.getAddress(), amount);
      await testVault.deposit(await token.getAddress(), amount);

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await testVault.getAddress());
      await mockPoolManager.waitForDeployment();
      await testVault.setPoolManager(await mockPoolManager.getAddress());

      const feeAmount = ethers.parseEther("10");
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), feeAmount);

      const balanceBefore = await token.balanceOf(owner.address);
      const vaultBalanceBefore = await testVault.getBalance(await token.getAddress());
      await testVault.withdrawProtocolFee(await token.getAddress(), owner.address, 0); // 0 = withdraw all
      const balanceAfter = await token.balanceOf(owner.address);
      const vaultBalanceAfter = await testVault.getBalance(await token.getAddress());

      expect(balanceAfter - balanceBefore).to.equal(feeAmount);
      expect(await testVault.getProtocolFee(await token.getAddress())).to.equal(0);
      // Verify balances is also updated
      expect(vaultBalanceBefore - vaultBalanceAfter).to.equal(feeAmount);
    });

    it("Should revert if non-owner tries to withdraw protocol fee", async function () {
      await expect(
        vault.connect(user1).withdrawProtocolFee(await token.getAddress(), user1.address, ethers.parseEther("10"))
      ).to.be.revertedWith("Only timelock or owner");
    });

    it("Should not allow withdraw of LP funds", async function () {
      // Create a new vault for this test
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const ChatOneSwapPoolManager = await ethers.getContractFactory("ChatOneSwapPoolManager");
      const poolManager = await ChatOneSwapPoolManager.deploy(await testVault.getAddress());
      await poolManager.waitForDeployment();
      await testVault.setPoolManager(await poolManager.getAddress());

      // Deploy tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
      await token1.waitForDeployment();

      // Create pool
      const fee = 3000;
      await poolManager.createPool(await token0.getAddress(), await token1.getAddress(), fee);

      // Add liquidity (this will update LP reserves)
      const liquidity0 = ethers.parseEther("1000");
      const liquidity1 = ethers.parseEther("1000");
      await token0.approve(await testVault.getAddress(), liquidity0);
      await token1.approve(await testVault.getAddress(), liquidity1);
      await testVault.deposit(await token0.getAddress(), liquidity0);
      await testVault.deposit(await token1.getAddress(), liquidity1);

      // Add liquidity to pool (this will call updateLpReserves)
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee]));
      
      await poolManager.addLiquidity(poolKey, liquidity0, liquidity1, owner.address);

      // Set timelock
      const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
      const timelock = await ChatOneSwapTimelock.deploy();
      await timelock.waitForDeployment();
      await testVault.setTimelock(await timelock.getAddress());

      // Verify LP reserves are set correctly
      expect(await testVault.lpReserves(await token0.getAddress())).to.equal(liquidity0);
      expect(await testVault.lpReserves(await token1.getAddress())).to.equal(liquidity1);

      // Try to withdraw LP funds directly (as owner) - should fail
      await expect(
        testVault.withdraw(await token0.getAddress(), liquidity0, owner.address)
      ).to.be.revertedWith("Cannot withdraw LP funds or protocol fees");
    });

    it("Should allow withdraw of non-LP funds", async function () {
      // Create a new vault for this test
      const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
      const testVault = await ChatOneSwapVault.deploy();
      await testVault.waitForDeployment();

      const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
      const timelock = await ChatOneSwapTimelock.deploy();
      await timelock.waitForDeployment();
      await testVault.setTimelock(await timelock.getAddress());

      // Deposit some non-LP funds
      const amount = ethers.parseEther("100");
      await token.approve(await testVault.getAddress(), amount);
      await testVault.deposit(await token.getAddress(), amount);

      // Withdraw should succeed (no LP reserves, no protocol fees)
      const data = testVault.interface.encodeFunctionData("withdraw", [
        await token.getAddress(),
        amount,
        owner.address
      ]);

      const tx = await timelock.scheduleOperation(await testVault.getAddress(), data);
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

      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      await timelock.executeOperation(operationId);

      expect(await testVault.getBalance(await token.getAddress())).to.equal(0);
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause the contract", async function () {
      await vault.pause();
      expect(await vault.paused()).to.be.true;
    });

    it("Should allow owner to unpause the contract", async function () {
      await vault.pause();
      await vault.unpause();
      expect(await vault.paused()).to.be.false;
    });

    it("Should allow deposit when paused (deposit not affected by pause)", async function () {
      await vault.pause();
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);
      
      expect(await vault.getBalance(await token.getAddress())).to.equal(amount);
    });

    it("Should revert withdraw when paused", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);
      
      await vault.pause();
      
      await expect(
        vault.withdraw(await token.getAddress(), amount, user1.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should revert withdrawProtocolFee when paused", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const feeAmount = ethers.parseEther("10");
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), feeAmount);

      await vault.pause();

      await expect(
        vault.withdrawProtocolFee(await token.getAddress(), owner.address, 0)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should revert transferOwnership when paused", async function () {
      await vault.pause();
      
      await expect(
        vault.transferOwnership(user1.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should revert renounceOwnership when paused", async function () {
      await vault.pause();
      
      await expect(
        vault.renounceOwnership()
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should revert if non-owner tries to pause", async function () {
      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Timelock", function () {
    let timelock;

    beforeEach(async function () {
      const ChatOneSwapTimelock = await ethers.getContractFactory("ChatOneSwapTimelock");
      timelock = await ChatOneSwapTimelock.deploy();
      await timelock.waitForDeployment();
      await vault.setTimelock(await timelock.getAddress());
    });

    it("Should allow owner to set timelock", async function () {
      expect(await vault.timelock()).to.equal(await timelock.getAddress());
    });

    it("Should allow timelock to call withdrawProtocolFee", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(await vault.getAddress(), amount);
      await vault.deposit(await token.getAddress(), amount);

      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const feeAmount = ethers.parseEther("10");
      await mockPoolManager.accumulateProtocolFee(await token.getAddress(), feeAmount);

      // Schedule operation through timelock
      const data = vault.interface.encodeFunctionData("withdrawProtocolFee", [
        await token.getAddress(),
        owner.address,
        0
      ]);
      
      const tx = await timelock.scheduleOperation(
        await vault.getAddress(),
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

      // Fast forward time (for testing, we'll use a workaround)
      // In real scenario, wait 48 hours
      await ethers.provider.send("evm_increaseTime", [172800]); // 48 hours
      await ethers.provider.send("evm_mine", []);

      // Execute operation
      await timelock.executeOperation(operationId);

      expect(await vault.getProtocolFee(await token.getAddress())).to.equal(0);
    });
  });
});

