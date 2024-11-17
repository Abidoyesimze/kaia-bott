// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TelegramNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    string public baseTokenURI;
    
    
    mapping(address => uint256) public lastMintTime;
    
    // 24 hours in seconds
    uint256 public constant MINT_COOLDOWN = 24 hours;
    
    constructor() ERC721("TelegramNFT", "TGNFT") Ownable(msg.sender) {
        baseTokenURI = "ipfs://YOUR_IPFS_CID/";
    }
    
    function mint(address recipient) public returns (uint256) {
        // Check if the sender has waited long enough since their last mint
        require(
            block.timestamp >= lastMintTime[msg.sender] + MINT_COOLDOWN,
            "Must wait 24 hours between mints"
        );
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked(baseTokenURI, toString(tokenId))));
        
        // Update the last mint time for the sender
        lastMintTime[msg.sender] = block.timestamp;
        
        return tokenId;
    }
    
    // Get time remaining until next available mint for an address
    function timeUntilNextMint(address user) public view returns (uint256) {
        uint256 timePassed = block.timestamp - lastMintTime[user];
        if (timePassed >= MINT_COOLDOWN) {
            return 0;
        }
        return MINT_COOLDOWN - timePassed;
    }
    
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseTokenURI = _newBaseURI;
    }
    
    // Helper function to convert uint to string
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // Override required functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage)
        returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage)
        returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}