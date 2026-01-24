import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace Webhooks {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Webhooks {
    protected readonly _options: Webhooks.Options;
    constructor(_options?: Webhooks.Options);
    /**
     * List all webhooks for a workspace
     *
     * @param {ElevenLabs.WebhooksListRequest} request
     * @param {Webhooks.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.webhooks.list({
     *         includeUsages: false
     *     })
     */
    list(request?: ElevenLabs.WebhooksListRequest, requestOptions?: Webhooks.RequestOptions): core.HttpResponsePromise<ElevenLabs.WorkspaceWebhookListResponseModel>;
    private __list;
}
