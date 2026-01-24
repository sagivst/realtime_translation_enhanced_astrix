import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Subscription {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Subscription {
    protected readonly _options: Subscription.Options;
    constructor(_options?: Subscription.Options);
    /**
     * Gets extended information about the users subscription
     *
     * @param {Subscription.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.user.subscription.get()
     */
    get(requestOptions?: Subscription.RequestOptions): core.HttpResponsePromise<ElevenLabs.Subscription>;
    private __get;
}
