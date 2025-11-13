// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChatOneSwapVault.sol";

/**
 * @title ChatOneSwapPoolManager
 * @notice AMM layer for ChatOneSwap - manages pool operations
 * @dev Based on PancakeSwap Infinity PoolManager architecture
 */
contract ChatOneSwapPoolManager is Ownable, ReentrancyGuard {
    ChatOneSwapVault public immutable vault;

    // Pool information
    struct Pool {
        address token0;
        address token1;
        uint24 fee;
        bool exists;
    }

    // Mapping of pool key to pool info
    mapping(bytes32 => Pool) public pools;

    // Events
    event PoolCreated(
        bytes32 indexed poolKey,
        address indexed token0,
        address indexed token1,
        uint24 fee
    );
    event Swap(
        bytes32 indexed poolKey,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault address");
        vault = ChatOneSwapVault(_vault);
    }

    /**
     * @notice Create a new pool
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier (in basis points)
     * @return poolKey The pool identifier
     */
    function createPool(
        address token0,
        address token1,
        uint24 fee
    ) external onlyOwner returns (bytes32 poolKey) {
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        require(token0 != token1, "Same token");
        require(fee > 0 && fee <= 10000, "Invalid fee"); // Max 100%

        // Sort tokens
        (address t0, address t1) = token0 < token1 ? (token0, token1) : (token1, token0);

        poolKey = keccak256(abi.encodePacked(t0, t1, fee));

        require(!pools[poolKey].exists, "Pool already exists");

        pools[poolKey] = Pool({
            token0: t0,
            token1: t1,
            fee: fee,
            exists: true
        });

        emit PoolCreated(poolKey, t0, t1, fee);
    }

    /**
     * @notice Check if a pool exists
     * @param poolKey The pool identifier
     * @return Whether the pool exists
     */
    function poolExists(bytes32 poolKey) external view returns (bool) {
        return pools[poolKey].exists;
    }

    /**
     * @notice Get pool information
     * @param poolKey The pool identifier
     * @return token0 First token address
     * @return token1 Second token address
     * @return fee Fee tier
     */
    function getPool(bytes32 poolKey)
        external
        view
        returns (
            address token0,
            address token1,
            uint24 fee
        )
    {
        Pool memory pool = pools[poolKey];
        require(pool.exists, "Pool does not exist");
        return (pool.token0, pool.token1, pool.fee);
    }
}

