// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/ChatOneSwapVault.sol";

/**
 * @title MockPoolManager
 * @notice Mock contract for testing protocol fee accumulation
 */
contract MockPoolManager {
    ChatOneSwapVault public vault;

    constructor(address _vault) {
        vault = ChatOneSwapVault(_vault);
    }

    function accumulateProtocolFee(address token, uint256 amount) external {
        vault.accumulateProtocolFee(token, amount);
    }
}

