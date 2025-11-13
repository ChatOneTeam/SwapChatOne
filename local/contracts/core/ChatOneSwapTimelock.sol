// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChatOneSwapTimelock
 * @notice Simple timelock for delayed execution of critical owner operations
 * @dev 48-hour delay for owner operations (setProtocolFee, withdrawProtocolFee, withdraw, etc.)
 */
contract ChatOneSwapTimelock is Ownable {
    // Default delay: 48 hours (172800 seconds)
    uint256 public constant DELAY = 172800; // 48 hours
    
    // Pending operations
    struct PendingOperation {
        address target;
        bytes data;
        uint256 executeTime;
        bool executed;
    }
    
    mapping(bytes32 => PendingOperation) public pendingOperations;
    
    // Events
    event OperationScheduled(
        bytes32 indexed operationId,
        address indexed target,
        bytes data,
        uint256 executeTime
    );
    event OperationExecuted(bytes32 indexed operationId);
    event OperationCancelled(bytes32 indexed operationId);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Schedule an operation for delayed execution (48 hours)
     * @param target The target contract address
     * @param data The function call data
     * @return operationId The operation identifier
     */
    function scheduleOperation(
        address target,
        bytes calldata data
    ) external onlyOwner returns (bytes32 operationId) {
        require(target != address(0), "Invalid target");
        
        // Include msg.sender to reduce collision probability
        operationId = keccak256(abi.encodePacked(
            target, 
            data, 
            block.timestamp, 
            block.number,
            msg.sender
        ));
        require(!pendingOperations[operationId].executed, "Operation already executed");
        require(pendingOperations[operationId].executeTime == 0, "Operation already scheduled");
        
        uint256 executeTime = block.timestamp + DELAY;
        
        pendingOperations[operationId] = PendingOperation({
            target: target,
            data: data,
            executeTime: executeTime,
            executed: false
        });
        
        emit OperationScheduled(operationId, target, data, executeTime);
    }
    
    /**
     * @notice Execute a scheduled operation
     * @param operationId The operation identifier
     */
    function executeOperation(bytes32 operationId) external {
        PendingOperation storage operation = pendingOperations[operationId];
        require(!operation.executed, "Operation already executed");
        require(block.timestamp >= operation.executeTime, "Operation not ready");
        
        operation.executed = true;
        
        (bool success, bytes memory returnData) = operation.target.call(operation.data);
        if (!success) {
            // Try to decode the revert reason
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert("Operation execution failed");
            }
        }
        
        emit OperationExecuted(operationId);
    }
    
    /**
     * @notice Cancel a scheduled operation (only owner, before execution time)
     * @param operationId The operation identifier
     */
    function cancelOperation(bytes32 operationId) external onlyOwner {
        PendingOperation storage operation = pendingOperations[operationId];
        require(!operation.executed, "Operation already executed");
        require(block.timestamp < operation.executeTime, "Operation already executable");
        
        delete pendingOperations[operationId];
        
        emit OperationCancelled(operationId);
    }
    
    /**
     * @notice Get operation info
     * @param operationId The operation identifier
     * @return target The target address
     * @return executeTime The execution time
     * @return executed Whether the operation has been executed
     */
    function getOperation(bytes32 operationId)
        external
        view
        returns (
            address target,
            uint256 executeTime,
            bool executed
        )
    {
        PendingOperation memory operation = pendingOperations[operationId];
        return (operation.target, operation.executeTime, operation.executed);
    }
    
    /**
     * @notice Check if operation is ready to execute
     * @param operationId The operation identifier
     * @return ready Whether the operation is ready
     */
    function isOperationReady(bytes32 operationId) external view returns (bool ready) {
        PendingOperation memory operation = pendingOperations[operationId];
        return !operation.executed && 
               operation.executeTime > 0 && 
               block.timestamp >= operation.executeTime;
    }
}

