import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { parseEther } from "ethers";

describe("DexWrapper", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDexWrapperFixture() {
    // Get signers
    const [owner, user, feeRecipient] = await hre.ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy(
      "Token A",
      "TKA",
      18,
      parseEther("1000000")
    );
    const tokenB = await MockERC20.deploy(
      "Token B",
      "TKB",
      18,
      parseEther("1000000")
    );

    // Deploy mock swap router
    const MockSwapRouter = await hre.ethers.getContractFactory("MockSwapRouter");
    const mockRouter = await MockSwapRouter.deploy();

    // Deploy mock quoter
    const MockQuoter = await hre.ethers.getContractFactory("MockQuoter");
    const mockQuoter = await MockQuoter.deploy();

    // Deploy FeeManager
    const FeeManager = await hre.ethers.getContractFactory("FeeManager");
    const feeRate = 10; // 0.1% (10 basis points)
    const feeManager = await FeeManager.deploy(feeRate, await feeRecipient.getAddress());

    // Deploy PancakeSwapV3Adapter
    const PancakeSwapV3Adapter = await hre.ethers.getContractFactory("PancakeSwapV3Adapter");
    const adapter = await PancakeSwapV3Adapter.deploy(
      await mockRouter.getAddress(),
      await mockQuoter.getAddress()
    );

    // Deploy DexWrapperRouter
    const DexWrapperRouter = await hre.ethers.getContractFactory("DexWrapperRouter");
    const router = await DexWrapperRouter.deploy(await feeManager.getAddress());

    // Register adapter for BSC (chain ID 56)
    await router.registerAdapter(56, await adapter.getAddress());

    // Setup tokens for testing
    const amount = parseEther("1000");
    await tokenA.mint(await user.getAddress(), amount);
    await tokenB.mint(await mockRouter.getAddress(), parseEther("1000000"));

    return {
      owner,
      user,
      feeRecipient,
      tokenA,
      tokenB,
      mockRouter,
      mockQuoter,
      feeManager,
      adapter,
      router,
    };
  }

  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { feeManager, adapter, router } = await loadFixture(deployDexWrapperFixture);

      expect(await feeManager.getAddress()).to.be.properAddress;
      expect(await adapter.getAddress()).to.be.properAddress;
      expect(await router.getAddress()).to.be.properAddress;
    });

    it("Should set correct fee rate", async function () {
      const { feeManager } = await loadFixture(deployDexWrapperFixture);
      expect(await feeManager.feeRate()).to.equal(10); // 0.1%
    });

    it("Should register adapter correctly", async function () {
      const { router, adapter } = await loadFixture(deployDexWrapperFixture);
      const registeredAdapter = await router.adapters(56);
      expect(registeredAdapter).to.equal(await adapter.getAddress());
    });
  });

  describe("Fee Management", function () {
    it("Should calculate fee correctly", async function () {
      const { feeManager } = await loadFixture(deployDexWrapperFixture);
      const amount = parseEther("1000");
      const fee = await feeManager.calculateFee(amount);
      // 0.1% of 1000 = 1
      expect(fee).to.equal(parseEther("1"));
    });

    it("Should collect fee correctly", async function () {
      const { feeManager, tokenA, user, feeRecipient } = await loadFixture(deployDexWrapperFixture);
      
      const amount = parseEther("1000");
      await tokenA.connect(user).approve(await feeManager.getAddress(), amount);
      
      const feeRecipientBalanceBefore = await tokenA.balanceOf(await feeRecipient.getAddress());
      await feeManager.connect(user).collectFee(await tokenA.getAddress(), amount);
      const feeRecipientBalanceAfter = await tokenA.balanceOf(await feeRecipient.getAddress());
      
      const fee = parseEther("1"); // 0.1% of 1000
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(fee);
    });

    it("Should reject fee rate above maximum", async function () {
      const { feeRecipient } = await loadFixture(deployDexWrapperFixture);
      const FeeManager = await hre.ethers.getContractFactory("FeeManager");
      
      await expect(
        FeeManager.deploy(1001, await feeRecipient.getAddress()) // > 10%
      ).to.be.revertedWith("FeeManager: fee rate too high");
    });
  });

  describe("Swap Operations", function () {
    it("Should execute swapExactInputSingle successfully", async function () {
      const { router, tokenA, tokenB, user, mockRouter } = await loadFixture(deployDexWrapperFixture);
      
      const amountIn = parseEther("100");
      const amountOutMinimum = parseEther("98"); // Allow 2% slippage
      const deadline = (await time.latest()) + 3600;
      const fee = 3000; // 0.3% pool fee
      const chainId = 56;

      // Approve router
      await tokenA.connect(user).approve(await router.getAddress(), amountIn);

      const userBalanceBefore = await tokenB.balanceOf(await user.getAddress());
      
      await router.connect(user).swapExactInputSingle(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        amountOutMinimum,
        await user.getAddress(),
        deadline,
        fee,
        chainId
      );

      const userBalanceAfter = await tokenB.balanceOf(await user.getAddress());
      expect(userBalanceAfter - userBalanceBefore).to.be.gte(amountOutMinimum);
    });

    it("Should collect fee on swap", async function () {
      const { router, tokenA, tokenB, user, feeRecipient, feeManager } = await loadFixture(deployDexWrapperFixture);
      
      const amountIn = parseEther("100");
      const deadline = (await time.latest()) + 3600;
      const fee = 3000;
      const chainId = 56;

      await tokenA.connect(user).approve(await router.getAddress(), amountIn);

      const feeRecipientBalanceBefore = await tokenA.balanceOf(await feeRecipient.getAddress());
      
      await router.connect(user).swapExactInputSingle(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        0,
        await user.getAddress(),
        deadline,
        fee,
        chainId
      );

      const feeRecipientBalanceAfter = await tokenA.balanceOf(await feeRecipient.getAddress());
      const expectedFee = parseEther("0.1"); // 0.1% of 100
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Should reject swap with expired deadline", async function () {
      const { router, tokenA, tokenB, user } = await loadFixture(deployDexWrapperFixture);
      
      const amountIn = parseEther("100");
      const pastDeadline = (await time.latest()) - 1;
      const fee = 3000;
      const chainId = 56;

      await tokenA.connect(user).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user).swapExactInputSingle(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountIn,
          0,
          await user.getAddress(),
          pastDeadline,
          fee,
          chainId
        )
      ).to.be.revertedWith("DexWrapperRouter: deadline passed");
    });

    it("Should reject swap with invalid adapter", async function () {
      const { router, tokenA, tokenB, user } = await loadFixture(deployDexWrapperFixture);
      
      const amountIn = parseEther("100");
      const deadline = (await time.latest()) + 3600;
      const fee = 3000;
      const invalidChainId = 1; // Ethereum, not registered

      await tokenA.connect(user).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user).swapExactInputSingle(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountIn,
          0,
          await user.getAddress(),
          deadline,
          fee,
          invalidChainId
        )
      ).to.be.revertedWith("DexWrapperRouter: adapter not found");
    });
  });

  describe("Access Control", function () {
    it("Should allow only owner to register adapter", async function () {
      const { router, adapter, user } = await loadFixture(deployDexWrapperFixture);
      
      await expect(
        router.connect(user).registerAdapter(1, await adapter.getAddress())
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });

    it("Should allow only owner to pause", async function () {
      const { router, user } = await loadFixture(deployDexWrapperFixture);
      
      await expect(
        router.connect(user).pause()
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause Functionality", function () {
    it("Should pause and unpause correctly", async function () {
      const { router, owner } = await loadFixture(deployDexWrapperFixture);
      
      await router.connect(owner).pause();
      expect(await router.paused()).to.be.true;
      
      await router.connect(owner).unpause();
      expect(await router.paused()).to.be.false;
    });

    it("Should reject swaps when paused", async function () {
      const { router, tokenA, tokenB, user, owner } = await loadFixture(deployDexWrapperFixture);
      
      await router.connect(owner).pause();
      
      const amountIn = parseEther("100");
      const deadline = (await time.latest()) + 3600;
      const fee = 3000;
      const chainId = 56;

      await tokenA.connect(user).approve(await router.getAddress(), amountIn);

      await expect(
        router.connect(user).swapExactInputSingle(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountIn,
          0,
          await user.getAddress(),
          deadline,
          fee,
          chainId
        )
      ).to.be.revertedWithCustomError(router, "EnforcedPause");
    });
  });
});

