// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IPancakeSwapQuoter
 * @notice Interface for PancakeSwap V3 Quoter
 */
interface IPancakeSwapQuoter {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
    }

    function quoteExactInputSingle(
        QuoteExactInputSingleParams memory params
    ) external returns (uint256 amountOut);
}

