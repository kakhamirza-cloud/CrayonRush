// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract CrayonCore is Ownable {
    using ECDSA for bytes32;

    IERC721 public immutable crayon;
    address public gameSigner;

    mapping(uint256 => uint256) public bestScore;
    mapping(uint256 => uint256) public achievementBits;
    mapping(bytes32 => bool) public usedClaims;

    event GameSignerUpdated(address indexed signer);
    event ProgressClaimed(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 bestScore,
        uint256 achievementBits,
        bytes32 claimId
    );

    constructor(address crayonAddress, address signer) Ownable(msg.sender) {
        require(crayonAddress != address(0), "bad crayon");
        require(signer != address(0), "bad signer");
        crayon = IERC721(crayonAddress);
        gameSigner = signer;
    }

    function setGameSigner(address signer) external onlyOwner {
        require(signer != address(0), "bad signer");
        gameSigner = signer;
        emit GameSignerUpdated(signer);
    }

    function claimProgress(
        uint256 tokenId,
        uint256 newBestScore,
        uint256 newAchievementBits,
        bytes32 claimId,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(crayon.ownerOf(tokenId) == msg.sender, "not token owner");
        require(block.timestamp <= deadline, "claim expired");
        require(!usedClaims[claimId], "claim already used");

        bytes32 digest = keccak256(
            abi.encode(
                address(this),
                block.chainid,
                msg.sender,
                tokenId,
                newBestScore,
                newAchievementBits,
                claimId,
                deadline
            )
        );
        address recovered = MessageHashUtils.toEthSignedMessageHash(digest).recover(signature);
        require(recovered == gameSigner, "invalid proof");

        usedClaims[claimId] = true;
        if (newBestScore > bestScore[tokenId]) bestScore[tokenId] = newBestScore;
        achievementBits[tokenId] |= newAchievementBits;

        emit ProgressClaimed(
            tokenId,
            msg.sender,
            bestScore[tokenId],
            achievementBits[tokenId],
            claimId
        );
    }
}
