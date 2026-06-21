// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ShadowCampaignRegistry} from "../src/ShadowCampaignRegistry.sol";
import {ShadowConfidentialToken} from "../src/ShadowConfidentialToken.sol";

contract MockContract {}

contract ShadowCampaignRegistryTest {
    function testRegisterAndArchiveCampaign() public {
        ShadowCampaignRegistry registry = new ShadowCampaignRegistry();
        MockContract implementation = new MockContract();
        MockContract token = new MockContract();
        bytes32 id = registry.registerCampaign(address(implementation), address(token), ShadowCampaignRegistry.CampaignKind.Airdrop, 100, 200, keccak256("metadata"));
        require(registry.campaignCount(address(this)) == 1, "campaign not indexed");
        require(registry.campaignAt(address(this), 0) == id, "campaign id mismatch");
        registry.archiveCampaign(id);
        (,,,,,,, bool archived,) = registry.campaigns(id);
        require(archived, "campaign not archived");
    }

    function testRejectsInvalidWindow() public {
        ShadowCampaignRegistry registry = new ShadowCampaignRegistry();
        MockContract implementation = new MockContract();
        MockContract token = new MockContract();
        try registry.registerCampaign(address(implementation), address(token), ShadowCampaignRegistry.CampaignKind.Airdrop, 200, 100, bytes32(0)) {
            revert("invalid window accepted");
        } catch {}
    }

    function testShadowConfidentialTokenConfigurationAndOperator() public {
        ShadowConfidentialToken token = new ShadowConfidentialToken("Shadow Token", "SHDW", 1_000_000_000, address(this));
        token.setOperator(address(0xBEEF), uint48(block.timestamp + 1 days));
        require(token.maxSupply() == 1_000_000_000, "wrong max supply");
        require(token.publicMintedSupply() == 0, "unexpected minted supply");
        require(token.isOperator(address(this), address(0xBEEF)), "operator not active");
    }
}
