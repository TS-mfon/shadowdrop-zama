// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract ShadowCampaignRegistry {
    enum CampaignKind { Airdrop, Vesting, Payroll, Grant, Referral, Team, Investor, Disperse }

    struct CampaignRecord {
        address owner;
        address implementation;
        address token;
        uint64 createdAt;
        uint64 startAt;
        uint64 endAt;
        CampaignKind kind;
        bool archived;
        bytes32 metadataHash;
    }

    mapping(bytes32 => CampaignRecord) public campaigns;
    mapping(address => bytes32[]) private _ownerCampaigns;
    mapping(address => bool) public registeredImplementations;

    error InvalidImplementation();
    error InvalidToken();
    error InvalidWindow();
    error CampaignNotFound();
    error NotCampaignOwner();
    error AlreadyRegistered();

    event CampaignRegistered(bytes32 indexed campaignId, address indexed owner, address indexed implementation, CampaignKind kind);
    event CampaignArchived(bytes32 indexed campaignId);

    function registerCampaign(address implementation, address token, CampaignKind kind, uint64 startAt, uint64 endAt, bytes32 metadataHash) external returns (bytes32 campaignId) {
        if (implementation == address(0) || implementation.code.length == 0) revert InvalidImplementation();
        if (token == address(0) || token.code.length == 0) revert InvalidToken();
        if (endAt <= startAt) revert InvalidWindow();
        campaignId = keccak256(abi.encode(block.chainid, msg.sender, implementation, _ownerCampaigns[msg.sender].length));
        if (campaigns[campaignId].owner != address(0)) revert AlreadyRegistered();
        campaigns[campaignId] = CampaignRecord(msg.sender, implementation, token, uint64(block.timestamp), startAt, endAt, kind, false, metadataHash);
        _ownerCampaigns[msg.sender].push(campaignId);
        registeredImplementations[implementation] = true;
        emit CampaignRegistered(campaignId, msg.sender, implementation, kind);
    }

    function archiveCampaign(bytes32 campaignId) external {
        CampaignRecord storage campaign = campaigns[campaignId];
        if (campaign.owner == address(0)) revert CampaignNotFound();
        if (campaign.owner != msg.sender) revert NotCampaignOwner();
        campaign.archived = true;
        emit CampaignArchived(campaignId);
    }

    function campaignCount(address owner) external view returns (uint256) { return _ownerCampaigns[owner].length; }
    function campaignAt(address owner, uint256 index) external view returns (bytes32) { return _ownerCampaigns[owner][index]; }
}
