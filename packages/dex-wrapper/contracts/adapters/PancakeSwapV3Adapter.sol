// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IDexAdapter.sol";
import "../interfaces/IPancakeSwapRouter.sol";
import "../interfaces/IPancakeSwapQuoter.sol";

/**
 * @title PancakeSwapV3Adapter
 * @notice Adapter for PancakeSwap V3 on BSC
 * @dev Implements IDexAdapter interface to interact with PancakeSwap V3 SwapRouter
 * 
 * PancakeSwap V3 SwapRouter addresses:
 * - BSC Mainnet: 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4
 * - BSC Testnet: 0x9a489505a00cE272eAa5e07Dba6491314CaE3796
 */
contract PancakeSwapV3Adapter is IDexAdapter, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice BSC Chain ID
    uint256 public constant BSC_CHAIN_ID = 56;
    
    /// @notice BSC Testnet Chain ID
    uint256 public constant BSC_TESTNET_CHAIN_ID = 97;

    /// @notice PancakeSwap V3 SwapRouter address (immutable for security)
    IPancakeSwapRouter public immutable swapRouter;

    /// @notice PancakeSwap V3 Quoter address (optional, for price quotes)
    IPancakeSwapQuoter public immutable quoter;

    /// @notice DEX name
    string private constant DEX_NAME = "PancakeSwap V3";

    /**
     * @param _swapRouter PancakeSwap V3 SwapRouter address
     * @param _quoter PancakeSwap V3 Quoter address (can be address(0) if not needed)
     */
    constructor(address _swapRouter, address _quoter) {
        require(_swapRouter != address(0), "PancakeSwapV3Adapter: invalid router");
        swapRouter = IPancakeSwapRouter(_swapRouter);
        quoter = IPancakeSwapQuoter(_quoter);
    }

    /**
     * @notice Get the DEX name
     * @return The name "PancakeSwap V3"
     */
    function dexName() external pure override returns (string memory) {
        return DEX_NAME;
    }

    /**
     * @notice Get the supported chain ID (BSC)
     * @return BSC chain ID (56 for mainnet, 97 for testnet)
     * @dev This adapter supports both BSC mainnet (56) and testnet (97)
     */
    function supportedChainId() external pure override returns (uint256) {
        // Return 0 to indicate it supports multiple chains (handled by router)
        // The router will validate based on the actual chain ID
        return 0;
    }

    /**
     * @notice Execute a swap with exact input using PancakeSwap V3
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param amountOutMinimum The minimum amount of output tokens (slippage protection)
     * @param recipient The address to receive the output tokens
     * @param deadline The transaction deadline
     * @param fee The pool fee tier (500, 2500, 3000, 10000 for 0.05%, 0.25%, 0.3%, 1%)
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
    ) external override nonReentrant returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "PancakeSwapV3Adapter: invalid tokens");
        require(amountIn > 0, "PancakeSwapV3Adapter: invalid amount");
        require(recipient != address(0), "PancakeSwapV3Adapter: invalid recipient");
        require(deadline >= block.timestamp, "PancakeSwapV3Adapter: deadline passed");

        // Transfer tokens from caller to this contract
        IERC20 tokenInContract = IERC20(tokenIn);
        tokenInContract.safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokens (clear previous approval first for safety)
        tokenInContract.forceApprove(address(swapRouter), amountIn);

        // Prepare swap parameters
        IPancakeSwapRouter.ExactInputSingleParams memory params = IPancakeSwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0 // No price limit
        });

        // Execute swap
        amountOut = swapRouter.exactInputSingle(params);

        // Reset approval for gas optimization
        tokenInContract.forceApprove(address(swapRouter), 0);

        return amountOut;
    }

    /**
     * @notice Execute a swap with exact output using PancakeSwap V3
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
    ) external override nonReentrant returns (uint256 amountIn) {
        require(tokenIn != address(0) && tokenOut != address(0), "PancakeSwapV3Adapter: invalid tokens");
        require(amountOut > 0, "PancakeSwapV3Adapter: invalid amount");
        require(recipient != address(0), "PancakeSwapV3Adapter: invalid recipient");
        require(deadline >= block.timestamp, "PancakeSwapV3Adapter: deadline passed");

        // Transfer maximum amount from caller to this contract
        IERC20 tokenInContract = IERC20(tokenIn);
        tokenInContract.safeTransferFrom(msg.sender, address(this), amountInMaximum);

        // Approve router to spend tokens (clear previous approval first for safety)
        tokenInContract.forceApprove(address(swapRouter), amountInMaximum);

        // Prepare swap parameters
        IPancakeSwapRouter.ExactOutputSingleParams memory params = IPancakeSwapRouter.ExactOutputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: deadline,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum,
            sqrtPriceLimitX96: 0 // No price limit
        });

        // Execute swap
        amountIn = swapRouter.exactOutputSingle(params);

        // Refund excess tokens if any
        if (amountIn < amountInMaximum) {
            tokenInContract.safeTransfer(msg.sender, amountInMaximum - amountIn);
        }

        // Reset approval
        tokenInContract.forceApprove(address(swapRouter), 0);

        return amountIn;
    }

    /**
     * @notice Get a quote for a swap (read-only)
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param fee The pool fee tier
     * @return amountOut The estimated amount of output tokens
     * @dev If quoter is not set, returns 0
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external override returns (uint256 amountOut) {
        if (address(quoter) == address(0)) {
            return 0;
        }

        try quoter.quoteExactInputSingle(
            IPancakeSwapQuoter.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                amountIn: amountIn,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 quote) {
            return quote;
        } catch {
            return 0;
        }
    }
}

