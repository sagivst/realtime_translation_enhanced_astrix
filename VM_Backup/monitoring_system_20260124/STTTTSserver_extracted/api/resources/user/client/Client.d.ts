import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { Subscription } from "../resources/subscription/client/Client";
export declare namespace User {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class User {
    protected readonly _options: User.Options;
    protected _subscription: Subscription | undefined;
    constructor(_options?: User.Options);
    get subscription(): Subscription;
    /**
     * Gets information about the user
     *
     * @param {User.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.user.get()
     */
    get(requestOptions?: User.RequestOptions): core.HttpResponsePromise<ElevenLabs.User>;
    private __get;
}
