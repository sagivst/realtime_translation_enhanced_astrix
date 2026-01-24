import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Secrets {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Secrets {
    protected readonly _options: Secrets.Options;
    constructor(_options?: Secrets.Options);
    /**
     * Get all workspace secrets for the user
     *
     * @param {Secrets.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.secrets.list()
     */
    list(requestOptions?: Secrets.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetWorkspaceSecretsResponseModel>;
    private __list;
    /**
     * Create a new secret for the workspace
     *
     * @param {ElevenLabs.conversationalAi.PostWorkspaceSecretRequest} request
     * @param {Secrets.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.secrets.create({
     *         name: "name",
     *         value: "value"
     *     })
     */
    create(request: ElevenLabs.conversationalAi.PostWorkspaceSecretRequest, requestOptions?: Secrets.RequestOptions): core.HttpResponsePromise<ElevenLabs.PostWorkspaceSecretResponseModel>;
    private __create;
    /**
     * Delete a workspace secret if it's not in use
     *
     * @param {string} secret_id
     * @param {Secrets.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.secrets.delete("secret_id")
     */
    delete(secret_id: string, requestOptions?: Secrets.RequestOptions): core.HttpResponsePromise<void>;
    private __delete;
    /**
     * Update an existing secret for the workspace
     *
     * @param {string} secret_id
     * @param {ElevenLabs.conversationalAi.PatchWorkspaceSecretRequest} request
     * @param {Secrets.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.secrets.update("secret_id", {
     *         name: "name",
     *         value: "value"
     *     })
     */
    update(secret_id: string, request: ElevenLabs.conversationalAi.PatchWorkspaceSecretRequest, requestOptions?: Secrets.RequestOptions): core.HttpResponsePromise<ElevenLabs.PostWorkspaceSecretResponseModel>;
    private __update;
}
