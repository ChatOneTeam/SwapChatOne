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

    // Set pool manager in vault (must be done by owner)
    await vault.setPoolManager(await poolManager.getAddress());

    // Deploy Router
    const ChatOneSwapRouter = await ethers.getContractFactory("ChatOneSwapRouter");
    router = await ChatOneSwapRouter.deploy(
      await poolManager.getAddress(),
      await vault.getAddress()
    );
    await router.waitForDeployment();

    // Set router in pool manager (must be done by owner)
    await poolManager.setRouter(await router.getAddress());

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token0", "T0", ethers.parseEther("1000000"));
    await token0.waitForDeployment();
    
    token1 = await MockERC20.deploy("Token1", "T1", ethers.parseEther("1000000"));
    await token1.waitForDeployment();

    // Create a pool and get the poolKey
    const fee = 3000; // 0.3%
    const tx = await poolManager.createPool(
      await token0.getAddress(),
      await token1.getAddress(),
      fee
    );
    const receipt = await tx.wait();
    
    // Extract poolKey from the PoolCreated event
    const poolCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = poolManager.interface.parseLog(log);
        return parsed && parsed.name === "PoolCreated";
      } catch {
        return false;
      }
    });
    
    // Calculate poolKey manually (same as in createPool: keccak256(abi.encodePacked(t0, t1, fee)))
    const t0 = await token0.getAddress();
    const t1 = await token1.getAddress();
    const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
    const poolKey = ethers.keccak256(
      ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
    );

    // Verify poolKey is correct
    expect(await poolManager.poolExists(poolKey)).to.be.true;
    
    // Add liquidity: 10000 token0 and 10000 token1
    // Need to match the order with sortedTokens
    const liquidityAmount0 = ethers.parseEther("10000");
    const liquidityAmount1 = ethers.parseEther("10000");
    
    // Determine which token corresponds to sortedTokens[0] and sortedTokens[1]
    const tokenForSorted0 = sortedTokens[0].toLowerCase() === t0.toLowerCase() ? token0 : token1;
    const tokenForSorted1 = sortedTokens[1].toLowerCase() === t1.toLowerCase() ? token1 : token0;
    
    await tokenForSorted0.approve(await router.getAddress(), liquidityAmount0);
    await tokenForSorted1.approve(await router.getAddress(), liquidityAmount1);
    
    await router.addLiquidity(
      poolKey,
      sortedTokens[0],
      sortedTokens[1],
      liquidityAmount0,
      liquidityAmount1,
      0,
      0,
      owner.address
    );
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
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const amountIn = ethers.parseEther("100");
      const quote = await router.getQuote(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amountIn
      );

      expect(quote).to.be.gt(0);
    });
  });

  describe("Swap", function () {
    it("Should execute a swap", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const amountIn = ethers.parseEther("100");
      const amountOutMin = ethers.parseEther("90");
      
      // Determine which token is token0 and token1 in sorted order
      const tokenIn = sortedTokens[0]; // Use first token in sorted order
      const tokenOut = sortedTokens[1]; // Use second token in sorted order
      
      // Transfer the correct token to user for swap
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;
      await tokenInContract.transfer(user1.address, amountIn);
      
      // Approve router to spend tokens (router will deposit to vault)
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      const tokenOutContract = tokenOut.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;
      const balanceBefore = await tokenOutContract.balanceOf(user1.address);

      await router.connect(user1).swap(
        poolKey,
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        user1.address
      );

      const balanceAfter = await tokenOutContract.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.be.gte(amountOutMin);
    });

    it("Should emit SwapExecuted event", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;
      
      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
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
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const amountIn = ethers.parseEther("100");
      const tokenIn = sortedTokens[0];
      const tokenOut = sortedTokens[1];
      const tokenInContract = tokenIn.toLowerCase() === (await token0.getAddress()).toLowerCase() ? token0 : token1;
      
      await tokenInContract.transfer(user1.address, amountIn);
      await tokenInContract.connect(user1).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user1).swap(
          poolKey,
          tokenIn,
          tokenOut,
          amountIn,
          ethers.parseEther("1000"), // Unrealistic minimum
          user1.address
        )
      ).to.be.revertedWith("Insufficient output amount");
    });
  });

  describe("Liquidity Management", function () {
    it("Should add liquidity to a pool", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      const amount0 = ethers.parseEther("5000");
      const amount1 = ethers.parseEther("5000");

      // Get reserves before
      const [reserve0Before, reserve1Before] = await poolManager.getReserves(poolKey);

      await token0.approve(await router.getAddress(), amount0);
      await token1.approve(await router.getAddress(), amount1);

      await router.addLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        amount0,
        amount1,
        0,
        0,
        owner.address
      );

      // Get reserves after
      const [reserve0After, reserve1After] = await poolManager.getReserves(poolKey);

      expect(reserve0After).to.equal(reserve0Before + amount0);
      expect(reserve1After).to.equal(reserve1Before + amount1);
    });

    it("Should remove liquidity from a pool", async function () {
      const fee = 3000;
      const t0 = await token0.getAddress();
      const t1 = await token1.getAddress();
      const sortedTokens = t0 < t1 ? [t0, t1] : [t1, t0];
      const poolKey = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint24"], [sortedTokens[0], sortedTokens[1], fee])
      );

      // Get total supply (liquidity tokens)
      const pool = await poolManager.pools(poolKey);
      const liquidityToRemove = pool.totalSupply / 2n; // Remove half

      // Get balances before
      const balance0Before = await (sortedTokens[0].toLowerCase() === t0.toLowerCase() ? token0 : token1).balanceOf(owner.address);
      const balance1Before = await (sortedTokens[1].toLowerCase() === t1.toLowerCase() ? token1 : token0).balanceOf(owner.address);

      // Get reserves before
      const [reserve0Before, reserve1Before] = await poolManager.getReserves(poolKey);

      await router.removeLiquidity(
        poolKey,
        sortedTokens[0],
        sortedTokens[1],
        liquidityToRemove,
        0,
        0,
        owner.address
      );

      // Get balances after
      const balance0After = await (sortedTokens[0].toLowerCase() === t0.toLowerCase() ? token0 : token1).balanceOf(owner.address);
      const balance1After = await (sortedTokens[1].toLowerCase() === t1.toLowerCase() ? token1 : token0).balanceOf(owner.address);

      // Check that tokens were returned
      expect(balance0After).to.be.gt(balance0Before);
      expect(balance1After).to.be.gt(balance1Before);

      // Get reserves after
      const [reserve0After, reserve1After] = await poolManager.getReserves(poolKey);

      // Reserves should decrease
      expect(reserve0After).to.be.lt(reserve0Before);
      expect(reserve1After).to.be.lt(reserve1Before);
    });
  });
});

