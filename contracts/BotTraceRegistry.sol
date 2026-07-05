// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BotTraceRegistry
/// @notice Compact on-chain registry for AI agent execution receipt digests.
contract BotTraceRegistry {
    struct ReceiptRecord {
        bytes32 receiptHash;
        string agentId;
        bytes32 policyHash;
        uint256 costWei;
        string tool;
        string decision;
        string timestamp;
        address submitter;
        uint256 blockNumber;
    }

    mapping(string receiptId => ReceiptRecord record) private receipts;
    string[] private receiptIds;

    event ReceiptSubmitted(
        string indexed receiptId,
        bytes32 indexed receiptHash,
        string agentId,
        bytes32 policyHash,
        uint256 costWei,
        string tool,
        string decision,
        string timestamp,
        address indexed submitter
    );

    function submitReceipt(
        string calldata receiptId,
        bytes32 receiptHash,
        string calldata agentId,
        bytes32 policyHash,
        uint256 costWei,
        string calldata tool,
        string calldata decision,
        string calldata timestamp
    ) external {
        require(bytes(receiptId).length != 0, "receipt id required");
        require(receiptHash != bytes32(0), "receipt hash required");
        require(receipts[receiptId].receiptHash == bytes32(0), "receipt already exists");

        receipts[receiptId] = ReceiptRecord({
            receiptHash: receiptHash,
            agentId: agentId,
            policyHash: policyHash,
            costWei: costWei,
            tool: tool,
            decision: decision,
            timestamp: timestamp,
            submitter: msg.sender,
            blockNumber: block.number
        });
        receiptIds.push(receiptId);

        emit ReceiptSubmitted(
            receiptId,
            receiptHash,
            agentId,
            policyHash,
            costWei,
            tool,
            decision,
            timestamp,
            msg.sender
        );
    }

    function getReceipt(string calldata receiptId) external view returns (ReceiptRecord memory) {
        return receipts[receiptId];
    }

    function receiptCount() external view returns (uint256) {
        return receiptIds.length;
    }

    function receiptIdAt(uint256 index) external view returns (string memory) {
        return receiptIds[index];
    }
}
