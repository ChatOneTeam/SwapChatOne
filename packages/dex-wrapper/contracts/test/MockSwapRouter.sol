// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockSwapRouter
 * @notice Mock PancakeSwap/Uniswap V3 SwapRouter for testing
 */
contract MockSwapRouter {
    using SafeERC20 for IERC20;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Exchange rate (1:1 by default, can be adjusted for testing)
    uint256 public exchangeRate = 1e18; // 1:1

    /// @notice Set exchange rate for testing
    function setExchangeRate(uint256 rate) external {
        exchangeRate = rate;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external returns (uint256 amountOut) {
        require(params.deadline >= block.timestamp, "MockSwapRouter: deadline passed");
        require(params.amountIn > 0, "MockSwapRouter: invalid amount");

        // Transfer input tokens from caller
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Calculate output amount (simplified: 1:1 exchange with small fee)
        // In real scenario, this would query the pool
        amountOut = (params.amountIn * exchangeRate) / 1e18;
        require(amountOut >= params.amountOutMinimum, "MockSwapRouter: insufficient output");

        // Transfer output tokens to recipient
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        return amountOut;
    }

    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external returns (uint256 amountIn) {
        require(params.deadline >= block.timestamp, "MockSwapRouter: deadline passed");
        require(params.amountOut > 0, "MockSwapRouter: invalid amount");

        // Calculate input amount needed
        amountIn = (params.amountOut * 1e18) / exchangeRate;
        require(amountIn <= params.amountInMaximum, "MockSwapRouter: excessive input");

        // Transfer input tokens from caller
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Transfer output tokens to recipient
        IERC20(params.tokenOut).safeTransfer(params.recipient, params.amountOut);

        return amountIn;
    }
}

