// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ChatOneSwapVault.sol";

/**
 * @title ChatOneSwapPoolManager
 * @notice AMM layer for ChatOneSwap - manages pool operations
 * @dev Based on PancakeSwap Infinity PoolManager architecture
 */
contract ChatOneSwapPoolManager is Ownable, ReentrancyGuard, Pausable {
    ChatOneSwapVault public immutable vault;

    // Authorized router for swap operations
    address public router;

    // Protocol fee (in basis points of swap fee, e.g., 2000 = 20% of swap fee goes to protocol)
    // Default: 20% of swap fee goes to protocol, 80% to LP
    uint256 public protocolFee = 2000; // 20% of swap fee

    // Timelock contract address (for delayed owner operations)
    address public timelock;

    // Pool information
    struct Pool {
        address token0;
        address token1;
        uint24 fee;
        bool exists;
        uint256 reserve0;  // Reserve of token0
        uint256 reserve1;  // Reserve of token1
        uint256 totalSupply; // Total liquidity tokens (for tracking)
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
    event LiquidityAdded(
        bytes32 indexed poolKey,
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );
    event LiquidityRemoved(
        bytes32 indexed poolKey,
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault address");
        vault = ChatOneSwapVault(_vault);
        // Note: Pool manager must be set in vault by owner after deployment
    }

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
     * @dev Pauses: transferOwnership, renounceOwnership
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
     * @notice Set the router address (only owner, can only be set once)
     * @param _router The router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router address");
        require(router == address(0), "Router already set");
        router = _router;
    }

    /**
     * @notice Set the protocol fee
     * @param _protocolFee The protocol fee in basis points (e.g., 2000 = 20% of swap fee)
     * @dev Maximum is 10000 (100% of swap fee)
     */
    function setProtocolFee(uint256 _protocolFee) external onlyOwner {
        require(_protocolFee <= 10000, "Protocol fee too high");
        protocolFee = _protocolFee;
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
            exists: true,
            reserve0: 0,
            reserve1: 0,
            totalSupply: 0
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

    /**
     * @notice Get pool reserves
     * @param poolKey The pool identifier
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     */
    function getReserves(bytes32 poolKey) external view returns (uint256 reserve0, uint256 reserve1) {
        Pool memory pool = pools[poolKey];
        require(pool.exists, "Pool does not exist");
        return (pool.reserve0, pool.reserve1);
    }

    /**
     * @notice Add liquidity to a pool
     * @param poolKey The pool identifier
     * @param amount0 Amount of token0 to add
     * @param amount1 Amount of token1 to add
     * @param provider The address providing liquidity
     * @return liquidity Amount of liquidity tokens minted
     */
    function addLiquidity(
        bytes32 poolKey,
        uint256 amount0,
        uint256 amount1,
        address provider
    ) external returns (uint256 liquidity) {
        // Only router can call this
        require(msg.sender == router || msg.sender == owner(), "Unauthorized");
        Pool storage pool = pools[poolKey];
        require(pool.exists, "Pool does not exist");
        require(provider != address(0), "Invalid provider");

        uint256 reserve0 = pool.reserve0;
        uint256 reserve1 = pool.reserve1;

        if (reserve0 == 0 && reserve1 == 0) {
            // First liquidity provision
            // Require minimum amounts to prevent dust attacks and ensure liquidity > 0
            // Using wei units: 1000 wei is a reasonable minimum
            require(amount0 >= 1000, "Amount0 too small");
            require(amount1 >= 1000, "Amount1 too small");
            liquidity = _sqrt(amount0 * amount1);
            require(liquidity > 0, "Insufficient liquidity");
        } else {
            // Calculate liquidity based on constant product formula
            // Ensure amounts are proportional to reserves
            require(amount0 > 0 && amount1 > 0, "Amounts must be greater than 0");
            uint256 liquidity0 = (amount0 * pool.totalSupply) / reserve0;
            uint256 liquidity1 = (amount1 * pool.totalSupply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
            require(liquidity > 0, "Insufficient liquidity");
        }

        // Update reserves
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalSupply += liquidity;

        // Update LP reserves in vault
        vault.updateLpReserves(pool.token0, int256(amount0));
        vault.updateLpReserves(pool.token1, int256(amount1));

        emit LiquidityAdded(poolKey, provider, amount0, amount1, liquidity);
    }

    /**
     * @notice Remove liquidity from a pool
     * @param poolKey The pool identifier
     * @param liquidity Amount of liquidity tokens to burn
     * @param provider The address removing liquidity
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function removeLiquidity(
        bytes32 poolKey,
        uint256 liquidity,
        address provider
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Only router can call this (to ensure provider is msg.sender from router)
        require(msg.sender == router || msg.sender == owner(), "Unauthorized");
        Pool storage pool = pools[poolKey];
        require(pool.exists, "Pool does not exist");
        require(pool.totalSupply > 0, "No liquidity");
        require(liquidity > 0, "Invalid liquidity amount");
        require(provider != address(0), "Invalid provider");
        // Note: In current implementation, liquidity tokens are tracked but not as ERC20
        // Router ensures provider == msg.sender, so only the liquidity provider can remove

        // Calculate amounts to return
        amount0 = (liquidity * pool.reserve0) / pool.totalSupply;
        amount1 = (liquidity * pool.reserve1) / pool.totalSupply;

        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");
        require(amount0 <= pool.reserve0 && amount1 <= pool.reserve1, "Insufficient reserves");

        // Update reserves
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;
        pool.totalSupply -= liquidity;

        // Update LP reserves in vault
        vault.updateLpReserves(pool.token0, -int256(amount0));
        vault.updateLpReserves(pool.token1, -int256(amount1));

        emit LiquidityRemoved(poolKey, provider, amount0, amount1, liquidity);
    }

    /**
     * @notice Update pool reserves after a swap (called by router)
     * @param poolKey The pool identifier
     * @param tokenIn The input token
     * @param amountIn The input amount
     * @param amountOut The output amount
     * @return protocolFeeAmount The protocol fee amount (in tokenIn)
     */
    function updateReservesAfterSwap(
        bytes32 poolKey,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut
    ) external returns (uint256 protocolFeeAmount) {
        // Only router can call this
        require(msg.sender == router, "Only router");
        Pool storage pool = pools[poolKey];
        require(pool.exists, "Pool does not exist");

        // Calculate swap fee (fee is in basis points, e.g., 3000 = 0.3%)
        uint256 swapFeeAmount = (amountIn * pool.fee) / 1000000;
        
        // Calculate protocol fee (protocolFee is percentage of swap fee, e.g., 2000 = 20%)
        // LP gets the remaining swap fee (swapFeeAmount - protocolFeeAmount)
        protocolFeeAmount = (swapFeeAmount * protocolFee) / 10000;
        
        // Amount that actually goes into reserves (amountIn minus total swap fee)
        // ✅ Fixed: Should subtract swapFeeAmount, not just protocolFeeAmount
        uint256 amountInForReserves = amountIn - swapFeeAmount;

        if (tokenIn == pool.token0) {
            pool.reserve0 += amountInForReserves;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve0 -= amountOut;
            pool.reserve1 += amountInForReserves;
        }

        // Accumulate protocol fee in vault
        if (protocolFeeAmount > 0) {
            vault.accumulateProtocolFee(tokenIn, protocolFeeAmount);
        }

        // Determine tokenOut based on tokenIn
        address tokenOut = (tokenIn == pool.token0) ? pool.token1 : pool.token0;

        // Emit Swap event
        emit Swap(poolKey, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Execute a swap transfer from vault (called by router)
     * @param tokenOut The output token
     * @param recipient The recipient address
     * @param amountOut The output amount
     */
    function executeSwapTransfer(
        address tokenOut,
        address recipient,
        uint256 amountOut
    ) external {
        // Only router can call this
        require(msg.sender == router, "Only router");
        vault.swapTransfer(tokenOut, recipient, amountOut);
    }

    /**
     * @notice Calculate square root using Babylonian method
     * @param x The number to calculate square root of
     * @return y The square root
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

