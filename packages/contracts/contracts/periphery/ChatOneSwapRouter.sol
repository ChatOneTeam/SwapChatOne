// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/ChatOneSwapPoolManager.sol";
import "../core/ChatOneSwapVault.sol";

/**
 * @title ChatOneSwapRouter
 * @notice Router contract for executing swaps on ChatOneSwap
 * @dev Based on PancakeSwap Infinity Router architecture
 */
contract ChatOneSwapRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ChatOneSwapPoolManager public immutable poolManager;
    ChatOneSwapVault public immutable vault;

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

        // Transfer input tokens from user to vault
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(vault), amountIn);

        // Calculate output amount (simplified - in production, use proper AMM formula)
        uint256 amountOut = calculateAmountOut(poolKey, tokenIn, tokenOut, amountIn);

        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Note: In production, this should use proper vault accounting
        // For now, we'll use a simplified approach where vault holds tokens
        // The vault's withdraw function is onlyOwner, so we need owner to approve router
        // This is a placeholder - proper implementation would use vault's accounting system
        // For testing, we'll transfer directly from vault (requires vault to have tokens)
        IERC20(tokenOut).safeTransferFrom(address(vault), recipient, amountOut);

        emit SwapExecuted(poolKey, tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    /**
     * @notice Calculate output amount for a swap (simplified version)
     * @dev In production, implement proper AMM formula (e.g., x * y = k)
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
        // Simplified calculation - in production, implement proper AMM math
        // This is a placeholder that needs to be replaced with actual AMM logic
        (address t0, address t1, uint24 fee) = poolManager.getPool(poolKey);
        require(
            (tokenIn == t0 && tokenOut == t1) || (tokenIn == t1 && tokenOut == t0),
            "Invalid tokens for pool"
        );

        // Placeholder: return 90% of input (this needs proper AMM implementation)
        // In production, use constant product formula or concentrated liquidity math
        uint256 feeAmount = (amountIn * fee) / 10000;
        amountOut = amountIn - feeAmount;
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
}

