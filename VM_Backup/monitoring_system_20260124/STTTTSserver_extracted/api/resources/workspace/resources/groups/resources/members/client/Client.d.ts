import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Members {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Members {
    protected readonly _options: Members.Options;
    constructor(_options?: Members.Options);
    /**
     * Removes a member from the specified group. This endpoint may only be called by workspace administrators.
     *
     * @param {string} group_id - The ID of the target group.
     * @param {ElevenLabs.workspace.groups.BodyDeleteMemberFromUserGroupV1WorkspaceGroupsGroupIdMembersRemovePost} request
     * @param {Members.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.workspace.groups.members.remove("group_id", {
     *         email: "email"
     *     })
     */
    remove(group_id: string, request: ElevenLabs.workspace.groups.BodyDeleteMemberFromUserGroupV1WorkspaceGroupsGroupIdMembersRemovePost, requestOptions?: Members.RequestOptions): core.HttpResponsePromise<ElevenLabs.DeleteWorkspaceGroupMemberResponseModel>;
    private __remove;
    /**
     * Adds a member of your workspace to the specified group. This endpoint may only be called by workspace administrators.
     *
     * @param {string} group_id - The ID of the target group.
     * @param {ElevenLabs.workspace.groups.AddMemberToGroupRequest} request
     * @param {Members.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.workspace.groups.members.add("group_id", {
     *         email: "email"
     *     })
     */
    add(group_id: string, request: ElevenLabs.workspace.groups.AddMemberToGroupRequest, requestOptions?: Members.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddWorkspaceGroupMemberResponseModel>;
    private __add;
}
