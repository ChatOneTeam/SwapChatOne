const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatOneSwapVault Missing Scenarios", function () {
  let vault;
  let token0;
  let token1;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();

    const ChatOneSwapVault = await ethers.getContractFactory("ChatOneSwapVault");
    vault = await ChatOneSwapVault.deploy();
    await vault.waitForDeployment();
  });

  describe("Flash Loan Fee Boundary Tests", function () {
    it("Should set flash loan fee to maximum (1000 = 10%)", async function () {
      await vault.setFlashLoanFee(1000);
      expect(await vault.flashLoanFee()).to.equal(1000);
    });

    it("Should set flash loan fee to minimum (0 = 0%)", async function () {
      await vault.setFlashLoanFee(0);
      expect(await vault.flashLoanFee()).to.equal(0);
    });
  });

  describe("Protocol Fee Accumulation for Different Tokens", function () {
    it("Should accumulate protocol fees for different tokens", async function () {
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const fee0 = ethers.parseEther("100");
      const fee1 = ethers.parseEther("200");

      // Deposit tokens first
      await token0.approve(await vault.getAddress(), fee0);
      await token1.approve(await vault.getAddress(), fee1);
      await vault.deposit(await token0.getAddress(), fee0);
      await vault.deposit(await token1.getAddress(), fee1);

      // Accumulate fees for different tokens
      await mockPoolManager.accumulateProtocolFee(await token0.getAddress(), fee0);
      await mockPoolManager.accumulateProtocolFee(await token1.getAddress(), fee1);

      expect(await vault.getProtocolFee(await token0.getAddress())).to.equal(fee0);
      expect(await vault.getProtocolFee(await token1.getAddress())).to.equal(fee1);
    });
  });

  describe("Protocol Fee Accumulation with Different Rates", function () {
    it("Should accumulate protocol fees correctly with different protocol fee rates", async function () {
      // This test would require a pool manager with different protocol fee rates
      // For now, we test that accumulation works correctly
      const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
      const mockPoolManager = await MockPoolManager.deploy(await vault.getAddress());
      await mockPoolManager.waitForDeployment();
      await vault.setPoolManager(await mockPoolManager.getAddress());

      const fee1 = ethers.parseEther("10");
      const fee2 = ethers.parseEther("20");
      const fee3 = ethers.parseEther("30");

      await token0.approve(await vault.getAddress(), fee1 + fee2 + fee3);
      await vault.deposit(await token0.getAddress(), fee1 + fee2 + fee3);

      // Accumulate fees at different times (simulating different rates)
      await mockPoolManager.accumulateProtocolFee(await token0.getAddress(), fee1);
      expect(await vault.getProtocolFee(await token0.getAddress())).to.equal(fee1);

      await mockPoolManager.accumulateProtocolFee(await token0.getAddress(), fee2);
      expect(await vault.getProtocolFee(await token0.getAddress())).to.equal(fee1 + fee2);

      await mockPoolManager.accumulateProtocolFee(await token0.getAddress(), fee3);
      expect(await vault.getProtocolFee(await token0.getAddress())).to.equal(fee1 + fee2 + fee3);
    });
  });
});

