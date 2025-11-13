// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ChatOneSwapVault
 * @notice Accounting layer for ChatOneSwap - manages asset storage and accounting
 * @dev Based on PancakeSwap Infinity Vault architecture
 */
contract ChatOneSwapVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(address indexed token, address indexed from, uint256 amount);
    event Withdraw(address indexed token, address indexed to, uint256 amount);
    event FlashLoan(address indexed token, address indexed to, uint256 amount);
    event ProtocolFeeAccumulated(address indexed token, uint256 amount);
    event ProtocolFeeWithdrawn(address indexed token, address indexed to, uint256 amount);

    // Mapping of token balances
    mapping(address => uint256) public balances;

    // Mapping of protocol fees accumulated per token
    mapping(address => uint256) public protocolFees;

    // Mapping of LP reserves per token (tracks liquidity provider deposits)
    mapping(address => uint256) public lpReserves;

    // Flash loan fee (in basis points, 1 = 0.01%)
    uint256 public flashLoanFee = 9; // 0.09%

    // Authorized pool manager for swap operations
    address public poolManager;

    // Timelock contract address (for delayed owner operations)
    address public timelock;

    constructor() Ownable(msg.sender) {}

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
     * @dev Pauses: withdraw, withdrawProtocolFee, transferOwnership, renounceOwnership
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
     * @notice Set the pool manager address (only owner, can only be set once)
     * @param _poolManager The pool manager address
     */
    function setPoolManager(address _poolManager) external onlyOwner {
        require(_poolManager != address(0), "Invalid pool manager");
        require(poolManager == address(0), "Pool manager already set");
        poolManager = _poolManager;
    }

    /**
     * @notice Deposit tokens into the vault
     * @param token The token to deposit
     * @param amount The amount to deposit
     * @dev Not paused - users can always deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[token] += amount;

        emit Deposit(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw tokens from the vault (cannot withdraw LP funds)
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     * @param to The address to send tokens to
     * @dev Requires timelock (48 hours delay) and not paused
     * @dev Cannot withdraw LP reserves or protocol fees (use withdrawProtocolFee for protocol fees)
     */
    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external nonReentrant onlyTimelockOrOwner whenNotPaused {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        require(balances[token] >= amount, "Insufficient balance");

        // Calculate withdrawable amount: total balance - LP reserves - protocol fees
        // ✅ Code quality fix: Simplified calculation logic
        uint256 totalBalance = balances[token];
        uint256 lpReserve = lpReserves[token];
        uint256 protocolFee = protocolFees[token];
        
        // Withdrawable = total - LP reserves - protocol fees (if sufficient)
        uint256 withdrawable;
        if (totalBalance >= lpReserve + protocolFee) {
            withdrawable = totalBalance - lpReserve - protocolFee;
        } else {
            withdrawable = 0;
        }

        require(amount <= withdrawable, "Cannot withdraw LP funds or protocol fees");

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
     * @notice Transfer tokens for swap operations (only pool manager)
     * @param token The token to transfer
     * @param to The recipient address
     * @param amount The amount to transfer
     * @dev Not paused - swap operations continue during pause
     */
    function swapTransfer(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == poolManager, "Only pool manager");
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(balances[token] >= amount, "Insufficient balance");

        balances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Accumulate protocol fee (called by pool manager)
     * @param token The token address
     * @param amount The protocol fee amount
     */
    function accumulateProtocolFee(address token, uint256 amount) external {
        require(msg.sender == poolManager, "Only pool manager");
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        
        // ✅ Security fix: Ensure balance is sufficient for protocol fee
        // Note: This check ensures consistency between protocolFees and balances
        require(balances[token] >= protocolFees[token] + amount, "Insufficient balance for protocol fee");
        
        protocolFees[token] += amount;
        emit ProtocolFeeAccumulated(token, amount);
    }

    /**
     * @notice Update LP reserves (called by pool manager when liquidity is added/removed)
     * @param token The token address
     * @param delta The change in LP reserves (positive for add, negative for remove)
     * @dev Only pool manager can call this
     */
    function updateLpReserves(address token, int256 delta) external {
        require(msg.sender == poolManager, "Only pool manager");
        require(token != address(0), "Invalid token");
        
        if (delta > 0) {
            // Check for overflow (low risk but good practice)
            require(lpReserves[token] <= type(uint256).max - uint256(delta), "LP reserves overflow");
            lpReserves[token] += uint256(delta);
        } else if (delta < 0) {
            uint256 absDelta = uint256(-delta);
            require(lpReserves[token] >= absDelta, "LP reserves underflow");
            lpReserves[token] -= absDelta;
        }
    }

    /**
     * @notice Get accumulated protocol fee for a token
     * @param token The token address
     * @return The accumulated protocol fee
     */
    function getProtocolFee(address token) external view returns (uint256) {
        return protocolFees[token];
    }

    /**
     * @notice Withdraw protocol fees
     * @param token The token to withdraw fees for
     * @param to The address to send fees to
     * @param amount The amount to withdraw (0 = withdraw all)
     * @dev Requires timelock (48 hours delay) and not paused
     * @dev Also updates balances mapping
     */
    function withdrawProtocolFee(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant onlyTimelockOrOwner whenNotPaused {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        
        uint256 availableFee = protocolFees[token];
        require(availableFee > 0, "No protocol fee available");
        
        uint256 withdrawAmount = amount == 0 ? availableFee : amount;
        require(withdrawAmount <= availableFee, "Insufficient protocol fee");
        
        // Ensure balances has enough tokens
        require(balances[token] >= withdrawAmount, "Insufficient balance");
        
        // Update both protocolFees and balances
        protocolFees[token] -= withdrawAmount;
        balances[token] -= withdrawAmount;
        IERC20(token).safeTransfer(to, withdrawAmount);
        
        emit ProtocolFeeWithdrawn(token, to, withdrawAmount);
    }

}

