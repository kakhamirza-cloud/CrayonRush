// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestCrayon is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    mapping(address => uint256) public tokenOf;
    string public metadataBase;

    constructor(string memory _metadataBase)
        ERC721("Crayon Rush Test Crayon", "CRAYONTEST")
        Ownable(msg.sender)
    {
        metadataBase = _metadataBase;
    }

    function claim() external returns (uint256 tokenId) {
        require(tokenOf[msg.sender] == 0, "already claimed");
        tokenId = nextTokenId++;
        tokenOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);
    }

    function setMetadataBase(string calldata newBase) external onlyOwner {
        metadataBase = newBase;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(metadataBase, _toString(tokenId));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
