// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Minimal ERC-7984-style confidential token for ShadowDrop issuer flows.
contract ShadowConfidentialToken is ZamaEthereumConfig, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string public name;
    string public symbol;
    uint8 public constant decimals = 6;
    uint64 public immutable maxSupply;
    uint64 public publicMintedSupply;
    bool public issuerBootstrapSupply;

    mapping(address => euint64) private _balances;
    mapping(address => mapping(address => uint48)) public operatorUntil;

    error InvalidAdmin();
    error InvalidRecipient();
    error MintExceedsMaxSupply();
    error NotOperator();

    event Mint(address indexed to, uint64 amount);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);
    event ConfidentialTransfer(address indexed operator, address indexed from, address indexed to);

    constructor(string memory name_, string memory symbol_, uint64 maxSupply_, address admin) {
        if (admin == address(0)) revert InvalidAdmin();
        name = name_;
        symbol = symbol_;
        maxSupply = maxSupply_;
        issuerBootstrapSupply = true;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function mint(address to, uint64 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert InvalidRecipient();
        if (publicMintedSupply + amount > maxSupply) revert MintExceedsMaxSupply();
        publicMintedSupply += amount;
        _balances[to] = FHE.add(_balances[to], FHE.asEuint64(amount));
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        emit Mint(to, amount);
    }

    function setOperator(address operator, uint48 until) external {
        operatorUntil[msg.sender][operator] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    function isOperator(address holder, address spender) public view returns (bool) {
        return operatorUntil[holder][spender] >= block.timestamp;
    }

    function confidentialTransfer(address to, externalEuint64 encryptedAmount, bytes calldata proof) external whenNotPaused returns (euint64) {
        return _transfer(msg.sender, msg.sender, to, FHE.fromExternal(encryptedAmount, proof));
    }

    function confidentialTransferFrom(address from, address to, euint64 amount) external whenNotPaused returns (euint64) {
        if (msg.sender != from && !isOperator(from, msg.sender)) revert NotOperator();
        return _transfer(msg.sender, from, to, amount);
    }

    function accessMyBalance() external returns (euint64) {
        FHE.allow(_balances[msg.sender], msg.sender);
        return _balances[msg.sender];
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function _transfer(address operator, address from, address to, euint64 amount) internal returns (euint64 transferable) {
        if (to == address(0)) revert InvalidRecipient();
        ebool sufficient = FHE.le(amount, _balances[from]);
        transferable = FHE.select(sufficient, amount, FHE.asEuint64(0));
        _balances[from] = FHE.sub(_balances[from], transferable);
        _balances[to] = FHE.add(_balances[to], transferable);
        FHE.allowThis(_balances[from]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[from], from);
        FHE.allow(_balances[to], to);
        FHE.allowTransient(transferable, msg.sender);
        emit ConfidentialTransfer(operator, from, to);
    }
}
