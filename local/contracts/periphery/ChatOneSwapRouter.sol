// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/ChatOneSwapPoolManager.sol";
import "../core/ChatOneSwapVault.sol";

/**
 * @title ChatOneSwapRouter
 * @notice Router contract for executing swaps on ChatOneSwap
 * @dev Based on PancakeSwap Infinity Router architecture
 */
contract ChatOneSwapRouter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    ChatOneSwapPoolManager public immutable poolManager;
    ChatOneSwapVault public immutable vault;

    // Timelock contract address (for delayed owner operations)
    address public timelock;

    // Events
    event SwapExecuted(
        bytes32 indexed poolKey,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    constructor(address _poolManager, address _vault) Ownable(msg.sender) {
        require(_poolManager != address(0), "Invalid pool manager");
        require(_vault != address(0), "Invalid vault");
        poolManager = ChatOneSwapPoolManager(_poolManager);
        vault = ChatOneSwapVault(_vault);
    }

    /**
     * @notice Internal helper to safely approve and deposit tokens
     * @dev Clears previous approval before setting new one to prevent approval front-running
     */
    function _safeApproveAndDeposit(address token, uint256 amount) internal {
        IERC20(token).approve(address(vault), 0);
        IERC20(token).approve(address(vault), amount);
        vault.deposit(token, amount);
    }

    /**
     * @notice Set the timelock address (only owner, can only be set once)
     * @param _timelock The timelock contract address
     */
    function setTimelock(address _timelock) external onlyOwner {
        require(_timelock != address(0), "Invalid timelock");
        require(timelock == address(0), "Timelock already set");
        timelock = _timelock;
    }

    /**
     * @notice Modifier for timelock or owner operations
     */
    modifier onlyTimelockOrOwner() {
        require(
            msg.sender == timelock || msg.sender == owner(),
            "Only timelock or owner"
        );
        _;
    }

    /**
     * @notice Pause the contract (only owner)
     * @dev Pauses: transferOwnership, renounceOwnership
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Transfer ownership of the contract (requires timelock and not paused)
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public override onlyTimelockOrOwner whenNotPaused {
        _transferOwnership(newOwner);
    }

    /**
     * @notice Renounce ownership of the contract (requires timelock and not paused)
     */
    function renounceOwnership() public override onlyTimelockOrOwner whenNotPaused {
        _transferOwnership(address(0));
    }

    /**
     * @notice Execute a swap
     * @param poolKey The pool identifier
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @param amountOutMin Minimum output amount (slippage protection)
     * @param recipient The recipient of the output tokens
     */
    function swap(
        bytes32 poolKey,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amountIn > 0, "Invalid amount");

        // Verify pool exists
        require(poolManager.poolExists(poolKey), "Pool does not exist");

        // Transfer input tokens from user to router first
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Then deposit to vault (router approves vault)
        // ✅ Security fix: Clear previous approval before setting new one
        _safeApproveAndDeposit(tokenIn, amountIn);

        // Calculate output amount using constant product formula (x * y = k)
        uint256 amountOut = calculateAmountOut(poolKey, tokenIn, tokenOut, amountIn);

        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Update pool reserves after swap
        poolManager.updateReservesAfterSwap(poolKey, tokenIn, amountIn, amountOut);

        // Transfer output tokens from vault to recipient via pool manager
        // Pool manager is authorized to call vault.swapTransfer
        poolManager.executeSwapTransfer(tokenOut, recipient, amountOut);

        emit SwapExecuted(poolKey, tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    /**
     * @notice Emergency function to recover tokens stuck in router
     * @param token The token address
     * @param to The recipient address
     * @param amount The amount to recover (0 = recover all)
     * @dev Only owner can call this
     * @dev This is a safety mechanism to recover tokens that may be stuck due to failed operations
     */
    function emergencyRecover(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to recover");
        
        uint256 recoverAmount = amount == 0 ? balance : amount;
        require(recoverAmount <= balance, "Insufficient balance");
        
        IERC20(token).safeTransfer(to, recoverAmount);
    }

    /**
     * @notice Calculate output amount for a swap using constant product formula (x * y = k)
     * @dev Implements the constant product AMM formula: (x + dx) * (y - dy) = x * y
     * @param poolKey The pool identifier
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @return amountOut The output amount
     */
    function calculateAmountOut(
        bytes32 poolKey,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        (address t0, address t1, uint24 fee) = poolManager.getPool(poolKey);
        require(
            (tokenIn == t0 && tokenOut == t1) || (tokenIn == t1 && tokenOut == t0),
            "Invalid tokens for pool"
        );

        // Get current reserves
        (uint256 reserve0, uint256 reserve1) = poolManager.getReserves(poolKey);
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == t0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);

        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // Calculate fee (fee is in basis points, 3000 = 0.3%)
        uint256 amountInWithFee = amountIn * (1000000 - fee);
        
        // Constant product formula: (x + dx) * (y - dy) = x * y
        // Solving for dy: dy = (y * dx) / (x + dx)
        // With fee: dy = (y * dx * (1 - fee)) / (x + dx * (1 - fee))
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000000) + amountInWithFee;
        amountOut = numerator / denominator;

        require(amountOut > 0, "Insufficient output amount");
    }

    /**
     * @notice Get quote for a swap
     * @param poolKey The pool identifier
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @return amountOut The estimated output amount
     */
    function getQuote(
        bytes32 poolKey,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        return calculateAmountOut(poolKey, tokenIn, tokenOut, amountIn);
    }

    /**
     * @notice Add liquidity to a pool
     * @param poolKey The pool identifier
     * @param token0 First token address
     * @param token1 Second token address
     * @param amount0Desired Desired amount of token0
     * @param amount1Desired Desired amount of token1
     * @param amount0Min Minimum amount of token0 (slippage protection)
     * @param amount1Min Minimum amount of token1 (slippage protection)
     * @param to Address to receive liquidity tokens
     * @return amount0 Actual amount of token0 added
     * @return amount1 Actual amount of token1 added
     * @return liquidity Amount of liquidity tokens minted
     */
    function addLiquidity(
        bytes32 poolKey,
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    ) {
        require(to != address(0), "Invalid recipient");
        
        // Get current reserves
        (uint256 reserve0, uint256 reserve1) = poolManager.getReserves(poolKey);
        
        uint256 amount0Optimal;
        uint256 amount1Optimal;
        
        if (reserve0 == 0 && reserve1 == 0) {
            // First liquidity provision - use desired amounts
            amount0Optimal = amount0Desired;
            amount1Optimal = amount1Desired;
        } else {
            // Calculate optimal amounts to maintain ratio
            uint256 amount1OptimalCalc = (amount0Desired * reserve1) / reserve0;
            if (amount1OptimalCalc <= amount1Desired) {
                require(amount1OptimalCalc >= amount1Min, "Insufficient amount1");
                amount0Optimal = amount0Desired;
                amount1Optimal = amount1OptimalCalc;
            } else {
                uint256 amount0OptimalCalc = (amount1Desired * reserve0) / reserve1;
                require(amount0OptimalCalc <= amount0Desired, "Insufficient amount0");
                require(amount0OptimalCalc >= amount0Min, "Insufficient amount0");
                amount0Optimal = amount0OptimalCalc;
                amount1Optimal = amount1Desired;
            }
        }
        
        // Transfer tokens from user to router and deposit to vault
        // ✅ Security fix: Clear previous approval before setting new one
        if (amount0Optimal > 0) {
            IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Optimal);
            _safeApproveAndDeposit(token0, amount0Optimal);
        }
        if (amount1Optimal > 0) {
            IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Optimal);
            _safeApproveAndDeposit(token1, amount1Optimal);
        }
        
        // Add liquidity to pool (provider is the user who initiated the transaction)
        liquidity = poolManager.addLiquidity(poolKey, amount0Optimal, amount1Optimal, to);
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        amount0 = amount0Optimal;
        amount1 = amount1Optimal;
    }

    /**
     * @notice Remove liquidity from a pool
     * @param poolKey The pool identifier
     * @param token0 First token address
     * @param token1 Second token address
     * @param liquidity Amount of liquidity tokens to burn
     * @param amount0Min Minimum amount of token0 (slippage protection)
     * @param amount1Min Minimum amount of token1 (slippage protection)
     * @param to Address to receive tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function removeLiquidity(
        bytes32 poolKey,
        address token0,
        address token1,
        uint256 liquidity,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(to != address(0), "Invalid recipient");
        require(liquidity > 0, "Invalid liquidity");
        
        // Remove liquidity from pool (provider is the user who initiated the transaction)
        (amount0, amount1) = poolManager.removeLiquidity(poolKey, liquidity, msg.sender);
        
        require(amount0 >= amount0Min, "Insufficient amount0");
        require(amount1 >= amount1Min, "Insufficient amount1");
        
        // Transfer tokens from vault to recipient
        poolManager.executeSwapTransfer(token0, to, amount0);
        poolManager.executeSwapTransfer(token1, to, amount1);
    }
}

