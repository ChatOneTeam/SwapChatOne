// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IDexAdapter.sol";
import "../interfaces/IFeeManager.sol";

/**
 * @title DexWrapperRouter
 * @notice Main router contract that wraps DEX protocols and adds fee collection
 * @dev Supports multiple DEX adapters (PancakeSwap V3, UniSwap V3, etc.)
 *      Uses adapter pattern for extensibility
 */
contract DexWrapperRouter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Fee manager contract
    IFeeManager public immutable feeManager;

    /// @notice Mapping from chain ID to DEX adapter
    mapping(uint256 => IDexAdapter) public adapters;

    /// @notice Emitted when a new adapter is registered
    event AdapterRegistered(uint256 indexed chainId, address indexed adapter, string dexName);

    /// @notice Emitted when an adapter is removed
    event AdapterRemoved(uint256 indexed chainId);

    /// @notice Emitted when a swap is executed
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount,
        uint256 chainId
    );

    /**
     * @param _feeManager Address of the FeeManager contract
     */
    constructor(address _feeManager) Ownable(msg.sender) {
        require(_feeManager != address(0), "DexWrapperRouter: invalid fee manager");
        feeManager = IFeeManager(_feeManager);
    }

    /**
     * @notice Register a DEX adapter for a specific chain
     * @param chainId The chain ID (e.g., 56 for BSC, 1 for Ethereum)
     * @param adapter The adapter contract address
     */
    function registerAdapter(uint256 chainId, address adapter) external onlyOwner {
        require(adapter != address(0), "DexWrapperRouter: invalid adapter");
        require(address(adapters[chainId]) == address(0), "DexWrapperRouter: adapter already exists");

        IDexAdapter dexAdapter = IDexAdapter(adapter);
        string memory dexName = dexAdapter.dexName();
        // Allow adapter with supportedChainId = 0 (supports multiple chains)
        uint256 adapterChainId = dexAdapter.supportedChainId();
        require(
            adapterChainId == 0 || adapterChainId == chainId,
            "DexWrapperRouter: chain ID mismatch"
        );

        adapters[chainId] = dexAdapter;
        emit AdapterRegistered(chainId, adapter, dexName);
    }

    /**
     * @notice Remove a DEX adapter (only owner, for emergency)
     * @param chainId The chain ID to remove adapter for
     */
    function removeAdapter(uint256 chainId) external onlyOwner {
        require(address(adapters[chainId]) != address(0), "DexWrapperRouter: adapter not found");
        delete adapters[chainId];
        emit AdapterRemoved(chainId);
    }

    /**
     * @notice Execute a swap with exact input
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param amountOutMinimum The minimum amount of output tokens (slippage protection)
     * @param recipient The address to receive the output tokens
     * @param deadline The transaction deadline
     * @param fee The pool fee tier
     * @param chainId The chain ID to use (determines which adapter to use)
     * @return amountOut The actual amount of output tokens received
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline,
        uint24 fee,
        uint256 chainId
    ) external whenNotPaused nonReentrant returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "DexWrapperRouter: invalid tokens");
        require(amountIn > 0, "DexWrapperRouter: invalid amount");
        require(recipient != address(0), "DexWrapperRouter: invalid recipient");
        require(deadline >= block.timestamp, "DexWrapperRouter: deadline passed");

        IDexAdapter adapter = adapters[chainId];
        require(address(adapter) != address(0), "DexWrapperRouter: adapter not found");

        // Transfer tokens from user to this contract first
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate fee
        uint256 feeAmount = feeManager.calculateFee(amountIn);
        uint256 amountInAfterFee = amountIn - feeAmount;

        // Transfer fee to fee recipient
        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(feeManager.feeRecipient(), feeAmount);
        }

        // Approve adapter to spend tokens (clear previous approval first for safety)
        IERC20(tokenIn).forceApprove(address(adapter), amountInAfterFee);

        // Execute swap through adapter
        amountOut = adapter.swapExactInputSingle(
            tokenIn,
            tokenOut,
            amountInAfterFee,
            amountOutMinimum,
            recipient,
            deadline,
            fee
        );

        // Reset approval
        IERC20(tokenIn).forceApprove(address(adapter), 0);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, feeAmount, chainId);

        return amountOut;
    }

    /**
     * @notice Execute a swap with exact output
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountOut The exact amount of output tokens desired
     * @param amountInMaximum The maximum amount of input tokens (slippage protection)
     * @param recipient The address to receive the output tokens
     * @param deadline The transaction deadline
     * @param fee The pool fee tier
     * @param chainId The chain ID to use
     * @return amountIn The actual amount of input tokens spent
     */
    function swapExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum,
        address recipient,
        uint256 deadline,
        uint24 fee,
        uint256 chainId
    ) external whenNotPaused nonReentrant returns (uint256 amountIn) {
        require(tokenIn != address(0) && tokenOut != address(0), "DexWrapperRouter: invalid tokens");
        require(amountOut > 0, "DexWrapperRouter: invalid amount");
        require(recipient != address(0), "DexWrapperRouter: invalid recipient");
        require(deadline >= block.timestamp, "DexWrapperRouter: deadline passed");

        IDexAdapter adapter = adapters[chainId];
        require(address(adapter) != address(0), "DexWrapperRouter: adapter not found");

        // Transfer maximum amount from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountInMaximum);

        // Calculate fee
        uint256 feeAmount = feeManager.calculateFee(amountInMaximum);
        uint256 amountInMaximumAfterFee = amountInMaximum - feeAmount;

        // Transfer fee to fee recipient
        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(feeManager.feeRecipient(), feeAmount);
        }

        // Approve adapter to spend tokens (clear previous approval first for safety)
        IERC20(tokenIn).forceApprove(address(adapter), amountInMaximumAfterFee);

        // Execute swap through adapter
        amountIn = adapter.swapExactOutputSingle(
            tokenIn,
            tokenOut,
            amountOut,
            amountInMaximumAfterFee,
            recipient,
            deadline,
            fee
        );

        // Calculate total amount used (including fee)
        uint256 totalAmountUsed = amountIn + feeAmount;

        // Refund excess tokens if any
        if (totalAmountUsed < amountInMaximum) {
            IERC20(tokenIn).safeTransfer(msg.sender, amountInMaximum - totalAmountUsed);
        }

        // Reset approval
        IERC20(tokenIn).forceApprove(address(adapter), 0);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, totalAmountUsed, amountOut, feeAmount, chainId);

        return totalAmountUsed;
    }

    /**
     * @notice Get a quote for a swap
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amountIn The amount of input tokens
     * @param fee The pool fee tier
     * @param chainId The chain ID to use
     * @return amountOut The estimated amount of output tokens (after fees)
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee,
        uint256 chainId
    ) external returns (uint256 amountOut) {
        IDexAdapter adapter = adapters[chainId];
        require(address(adapter) != address(0), "DexWrapperRouter: adapter not found");

        // Calculate fee
        uint256 feeAmount = feeManager.calculateFee(amountIn);
        uint256 amountInAfterFee = amountIn - feeAmount;

        // Get quote from adapter
        return adapter.getQuote(tokenIn, tokenOut, amountInAfterFee, fee);
    }

    /**
     * @notice Pause the contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency function to withdraw tokens (only owner)
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}

