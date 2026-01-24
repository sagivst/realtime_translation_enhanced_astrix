import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { ApiKeys } from "../resources/apiKeys/client/Client";
export declare namespace ServiceAccounts {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ServiceAccounts {
    protected readonly _options: ServiceAccounts.Options;
    protected _apiKeys: ApiKeys | undefined;
    constructor(_options?: ServiceAccounts.Options);
    get apiKeys(): ApiKeys;
    /**
     * List all service accounts in the workspace
     *
     * @param {ServiceAccounts.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.serviceAccounts.list()
     */
    list(requestOptions?: ServiceAccounts.RequestOptions): core.HttpResponsePromise<ElevenLabs.WorkspaceServiceAccountListResponseModel>;
    private __list;
}
