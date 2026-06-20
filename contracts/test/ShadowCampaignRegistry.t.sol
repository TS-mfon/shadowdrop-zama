// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ShadowCampaignRegistry} from "../src/ShadowCampaignRegistry.sol";

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
}
