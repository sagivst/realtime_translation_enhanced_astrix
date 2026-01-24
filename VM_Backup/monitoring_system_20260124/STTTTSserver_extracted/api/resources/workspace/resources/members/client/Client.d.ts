import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
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
     * Updates attributes of a workspace member. Apart from the email identifier, all parameters will remain unchanged unless specified. This endpoint may only be called by workspace administrators.
     *
     * @param {ElevenLabs.workspace.UpdateMemberRequest} request
     * @param {Members.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.workspace.members.update({
     *         email: "email"
     *     })
     */
    update(request: ElevenLabs.workspace.UpdateMemberRequest, requestOptions?: Members.RequestOptions): core.HttpResponsePromise<ElevenLabs.UpdateWorkspaceMemberResponseModel>;
    private __update;
}
