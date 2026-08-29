// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CrayonCoreDemo
/// @notice Small Robinhood Chain testnet demo contract for Crayon Rush.
///         It intentionally keeps the demo simple: one free Test Crayon per wallet,
///         and an authorized Crayon Rush signer can record verified progress.
contract CrayonCoreDemo {
    string public constant name = "Crayon Rush Test Crayon";
    string public constant symbol = "CRAYONTEST";

    address public owner;
    address public gameSigner;
    uint256 public nextTokenId = 1;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public tokenOf;
    mapping(uint256 => uint256) public bestScore;
    mapping(uint256 => uint256) public achievementBits;
    mapping(bytes32 => bool) public usedClaims;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event ProgressRecorded(uint256 indexed tokenId, uint256 bestScore, uint256 achievementBits, bytes32 claimId);

    modifier onlyOwner() { require(msg.sender == owner, "owner only"); _; }

    constructor(address _gameSigner) {
        owner = msg.sender;
        gameSigner = _gameSigner;
    }

    function setGameSigner(address signer) external onlyOwner {
        gameSigner = signer;
    }

    function claimTestCrayon() external returns (uint256 tokenId) {
        require(tokenOf[msg.sender] == 0, "already claimed");
        tokenId = nextTokenId++;
        tokenOf[msg.sender] = tokenId;
        ownerOf[tokenId] = msg.sender;
        emit Transfer(address(0), msg.sender, tokenId);
    }

    /// @dev achievementBits example: bit0 First Rush, bit1 Speedy, bit2 Rusher, bit3 Super Rusher.
    function recordProgress(
        uint256 tokenId,
        uint256 newBestScore,
        uint256 newAchievementBits,
        bytes32 claimId,
        bytes calldata signature
    ) external {
        require(ownerOf[tokenId] == msg.sender, "not token owner");
        require(!usedClaims[claimId], "claim used");

        bytes32 digest = keccak256(abi.encodePacked(
            address(this), block.chainid, msg.sender, tokenId,
            newBestScore, newAchievementBits, claimId
        ));
        bytes32 ethHash = keccak256(abi.encodePacked("\\x19Ethereum Signed Message:\\n32", digest));
        require(_recover(ethHash, signature) == gameSigner, "bad signer");

        usedClaims[claimId] = true;
        if (newBestScore > bestScore[tokenId]) bestScore[tokenId] = newBestScore;
        achievementBits[tokenId] |= newAchievementBits;
        emit ProgressRecorded(tokenId, bestScore[tokenId], achievementBits[tokenId], claimId);
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad signature");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad v");
        return ecrecover(hash, v, r, s);
    }
}
