// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IFeeManager.sol";

/**
 * @title FeeManager
 * @notice Manages fee collection for the DEX wrapper
 * @dev Uses basis points (1 basis point = 0.01%) for fee calculation
 *      Maximum fee rate is 1000 basis points (10%)
 */
contract FeeManager is IFeeManager, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Maximum fee rate in basis points (10%)
    uint256 public constant MAX_FEE_RATE = 1000;

    /// @notice Current fee rate in basis points
    uint256 private _feeRate;

    /// @notice Address that receives collected fees
    address private _feeRecipient;

    /// @notice Emitted when fee rate is updated
    event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate);

    /// @notice Emitted when fee recipient is updated
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    /// @notice Emitted when fees are collected
    event FeeCollected(address indexed token, uint256 amount, address recipient);

    /**
     * @param initialFeeRate Initial fee rate in basis points (e.g., 10 = 0.1%)
     * @param initialFeeRecipient Initial fee recipient address
     */
    constructor(uint256 initialFeeRate, address initialFeeRecipient) Ownable(msg.sender) {
        require(initialFeeRate <= MAX_FEE_RATE, "FeeManager: fee rate too high");
        require(initialFeeRecipient != address(0), "FeeManager: invalid recipient");

        _feeRate = initialFeeRate;
        _feeRecipient = initialFeeRecipient;
    }

    /**
     * @notice Calculate the fee amount for a given transaction
     * @param amount The transaction amount
     * @return feeAmount The calculated fee amount
     */
    function calculateFee(uint256 amount) external view override returns (uint256 feeAmount) {
        if (_feeRate == 0) {
            return 0;
        }
        // Calculate fee: amount * feeRate / 10000
        feeAmount = (amount * _feeRate) / 10000;
    }

    /**
     * @notice Get the current fee rate
     * @return The fee rate in basis points
     */
    function feeRate() external view override returns (uint256) {
        return _feeRate;
    }

    /**
     * @notice Get the fee recipient address
     * @return The address that receives collected fees
     */
    function feeRecipient() external view override returns (address) {
        return _feeRecipient;
    }

    /**
     * @notice Collect fees from a transaction
     * @param token The token address to collect fees in
     * @param amount The amount of tokens to collect fees from
     * @return feeAmount The amount of fees collected
     */
    function collectFee(
        address token,
        uint256 amount
    ) external override nonReentrant returns (uint256 feeAmount) {
        if (_feeRate == 0) {
            return 0;
        }

        feeAmount = (amount * _feeRate) / 10000;
        
        if (feeAmount > 0) {
            IERC20(token).safeTransferFrom(msg.sender, _feeRecipient, feeAmount);
            emit FeeCollected(token, feeAmount, _feeRecipient);
        }

        return feeAmount;
    }

    /**
     * @notice Update the fee rate (only owner)
     * @param newFeeRate New fee rate in basis points
     */
    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "FeeManager: fee rate too high");
        
        uint256 oldFeeRate = _feeRate;
        _feeRate = newFeeRate;
        
        emit FeeRateUpdated(oldFeeRate, newFeeRate);
    }

    /**
     * @notice Update the fee recipient address (only owner)
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "FeeManager: invalid recipient");
        
        address oldRecipient = _feeRecipient;
        _feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
}

