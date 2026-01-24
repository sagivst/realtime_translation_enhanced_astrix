import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Members } from "../resources/members/client/Client";
export declare namespace Groups {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Groups {
    protected readonly _options: Groups.Options;
    protected _members: Members | undefined;
    constructor(_options?: Groups.Options);
    get members(): Members;
    /**
     * Searches for user groups in the workspace. Multiple or no groups may be returned.
     *
     * @param {ElevenLabs.workspace.GroupsSearchRequest} request
     * @param {Groups.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.workspace.groups.search({
     *         name: "name"
     *     })
     */
    search(request: ElevenLabs.workspace.GroupsSearchRequest, requestOptions?: Groups.RequestOptions): core.HttpResponsePromise<ElevenLabs.WorkspaceGroupByNameResponseModel[]>;
    private __search;
}
