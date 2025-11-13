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
      await token.approve(await vault.getAddress(), amount);
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
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
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
});

