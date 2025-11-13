const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Multi-Contract Interaction", function () {
  let vault;
  let poolManager;
  let router;
  let timelock;
  let token0;
  let token1;
  let owner;
  let user1;
  let poolKey;
  let sortedTokens;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy all contracts
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

    // Initialize
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
  });

  describe("Router -> PoolManager -> Vault Interaction", function () {
    it("Should handle complete Router -> PoolManager -> Vault flow", async function () {
      const swapAmount = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      // Router receives tokens from user
      await tokenInContract.transfer(user1.address, swapAmount);
      await tokenInContract.connect(user1).approve(await router.getAddress(), swapAmount);

      const vaultBalanceBefore = await vault.getBalance(tokenIn);
      const reservesBefore = await poolManager.getReserves(poolKey);

      // Router -> PoolManager -> Vault interaction
      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        user1.address
      );

      // Verify Vault balance increased
      const vaultBalanceAfter = await vault.getBalance(tokenIn);
      expect(vaultBalanceAfter).to.be.gt(vaultBalanceBefore);

      // Verify reserves updated
      const reservesAfter = await poolManager.getReserves(poolKey);
      expect(reservesAfter[0]).to.be.gt(reservesBefore[0]);
      expect(reservesAfter[1]).to.be.lt(reservesBefore[1]);
    });
  });

  describe("PoolManager -> Vault Fee Accumulation", function () {
    it("Should handle PoolManager -> Vault protocol fee accumulation", async function () {
      const swapAmount = ethers.parseEther("1000");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.approve(await router.getAddress(), swapAmount);

      const protocolFeeBefore = await vault.getProtocolFee(tokenIn);

      // Perform swap (PoolManager accumulates fee in Vault)
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("900"),
        owner.address
      );

      const protocolFeeAfter = await vault.getProtocolFee(tokenIn);
      expect(protocolFeeAfter).to.be.gt(protocolFeeBefore);
    });
  });

  describe("Timelock -> Contract Operations", function () {
    it("Should handle Timelock -> Vault operation", async function () {
      // Use a separate token to avoid conflicts with pool operations
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const testToken = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
      await testToken.waitForDeployment();

      const amount = ethers.parseEther("100");
      await testToken.approve(await vault.getAddress(), amount);
      await vault.deposit(await testToken.getAddress(), amount);

      const balanceBefore = await vault.getBalance(await testToken.getAddress());
      expect(balanceBefore).to.equal(amount);

      const data = vault.interface.encodeFunctionData("withdraw", [
        await testToken.getAddress(),
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

      await ethers.provider.send("evm_increaseTime", [172800]);
      await ethers.provider.send("evm_mine", []);

      await timelock.executeOperation(operationId);

      const balanceAfter = await vault.getBalance(await testToken.getAddress());
      expect(balanceAfter).to.equal(0);
    });

    it("Should handle Timelock -> PoolManager operation (transferOwnership)", async function () {
      // setProtocolFee doesn't require timelock, so test transferOwnership instead
      const data = poolManager.interface.encodeFunctionData("transferOwnership", [user1.address]);

      const tx = await timelock.scheduleOperation(await poolManager.getAddress(), data);
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

      expect(await poolManager.owner()).to.equal(user1.address);
    });
  });

  describe("Concurrent Cross-Contract Operations", function () {
    it("Should handle concurrent operations across contracts", async function () {
      // Multiple swaps (Router -> PoolManager -> Vault)
      const swapAmount = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;

      await tokenInContract.approve(await router.getAddress(), swapAmount * 3n);

      // First swap
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );

      // Second swap
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );

      // Third swap
      await router.swap(
        poolKey,
        tokenIn,
        tokenOut,
        swapAmount,
        ethers.parseEther("90"),
        owner.address
      );

      // Verify protocol fee accumulated
      const protocolFee = await vault.getProtocolFee(tokenIn);
      expect(protocolFee).to.be.gt(0);

      // Verify reserves updated
      const reserves = await poolManager.getReserves(poolKey);
      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });
  });
});

