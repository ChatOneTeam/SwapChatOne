// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IDexAdapter
 * @notice Abstract interface for DEX adapters
 * @dev This interface allows the wrapper to support multiple DEX protocols
 *      (PancakeSwap V3 on BSC, UniSwap V3 on ETH, etc.)
 */
interface IDexAdapter {
    /**
     * @notice Get the DEX name
     * @return The name of the DEX (e.g., "PancakeSwap V3", "UniSwap V3")
     */
    function dexName() external pure returns (string memory);

    /**
     * @notice Get the chain ID this adapter supports
     * @return The chain ID (e.g., 56 for BSC, 1 for Ethereum)
     */
    function supportedChainId() external pure returns (uint256);

    /**
     * @notice Execute a swap using the underlying DEX
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param amountOutMinimum The minimum amount of output tokens (slippage protection)
     * @param recipient The address to receive the output tokens
     * @param deadline The transaction deadline
     * @param fee The pool fee tier (e.g., 500, 3000, 10000 for 0.05%, 0.3%, 1%)
     * @return amountOut The actual amount of output tokens received
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline,
        uint24 fee
    ) external returns (uint256 amountOut);

    /**
     * @notice Execute a swap with exact output using the underlying DEX
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountOut The exact amount of output tokens desired
     * @param amountInMaximum The maximum amount of input tokens (slippage protection)
     * @param recipient The address to receive the output tokens
     * @param deadline The transaction deadline
     * @param fee The pool fee tier
     * @return amountIn The actual amount of input tokens spent
     */
    function swapExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum,
        address recipient,
        uint256 deadline,
        uint24 fee
    ) external returns (uint256 amountIn);

    /**
     * @notice Get the quote for a swap (read-only)
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param fee The pool fee tier
     * @return amountOut The estimated amount of output tokens
     * @dev Note: This function may not be view if the underlying quoter modifies state
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut);
}

