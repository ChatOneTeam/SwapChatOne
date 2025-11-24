// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IFeeManager
 * @notice Interface for fee management
 * @dev Handles fee calculation and collection
 */
interface IFeeManager {
    /**
     * @notice Calculate the fee amount for a given transaction
     * @param amount The transaction amount
     * @return feeAmount The calculated fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256 feeAmount);

    /**
     * @notice Get the current fee rate (in basis points, e.g., 10 = 0.1%)
     * @return The fee rate in basis points
     */
    function feeRate() external view returns (uint256);

    /**
     * @notice Get the fee recipient address
     * @return The address that receives collected fees
     */
    function feeRecipient() external view returns (address);

    /**
     * @notice Collect fees from a transaction
     * @param token The token address to collect fees in
     * @param amount The amount of tokens to collect fees from
     * @return feeAmount The amount of fees collected
     */
    function collectFee(address token, uint256 amount) external returns (uint256 feeAmount);
}

