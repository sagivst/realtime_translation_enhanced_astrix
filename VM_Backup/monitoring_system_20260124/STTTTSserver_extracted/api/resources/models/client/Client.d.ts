import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace Models {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
/**
 * Access the different models of the platform.
 */
export declare class Models {
    protected readonly _options: Models.Options;
    constructor(_options?: Models.Options);
    /**
     * Gets a list of available models.
     *
     * @param {Models.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.models.list()
     */
    list(requestOptions?: Models.RequestOptions): core.HttpResponsePromise<ElevenLabs.Model[]>;
    private __list;
}
