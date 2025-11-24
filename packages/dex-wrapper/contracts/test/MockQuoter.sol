// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title MockQuoter
 * @notice Mock Quoter for price quotes
 */
contract MockQuoter {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Exchange rate for quotes
    uint256 public exchangeRate = 1e18; // 1:1

    function setExchangeRate(uint256 rate) external {
        exchangeRate = rate;
    }

    function quoteExactInputSingle(
        QuoteExactInputSingleParams memory params
    ) external view returns (uint256 amountOut) {
        return (params.amountIn * exchangeRate) / 1e18;
    }
}

