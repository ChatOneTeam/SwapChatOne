// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ChatOneSwapVault
 * @notice Accounting layer for ChatOneSwap - manages asset storage and accounting
 * @dev Based on PancakeSwap Infinity Vault architecture
 */
contract ChatOneSwapVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(address indexed token, address indexed from, uint256 amount);
    event Withdraw(address indexed token, address indexed to, uint256 amount);
    event FlashLoan(address indexed token, address indexed to, uint256 amount);

    // Mapping of token balances
    mapping(address => uint256) public balances;

    // Flash loan fee (in basis points, 1 = 0.01%)
    uint256 public flashLoanFee = 9; // 0.09%

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deposit tokens into the vault
     * @param token The token to deposit
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[token] += amount;

        emit Deposit(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw tokens from the vault
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     * @param to The address to send tokens to
     */
    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external nonReentrant onlyOwner {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        require(balances[token] >= amount, "Insufficient balance");

        balances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit Withdraw(token, to, amount);
    }

    /**
     * @notice Get the balance of a token in the vault
     * @param token The token address
     * @return The balance
     */
    function getBalance(address token) external view returns (uint256) {
        return balances[token];
    }

    /**
     * @notice Set the flash loan fee
     * @param newFee The new fee in basis points
     */
    function setFlashLoanFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        flashLoanFee = newFee;
    }

    /**
     * @notice Emergency withdraw function (only owner)
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}

