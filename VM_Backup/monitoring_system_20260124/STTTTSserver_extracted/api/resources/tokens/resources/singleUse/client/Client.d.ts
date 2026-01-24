import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace SingleUse {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class SingleUse {
    protected readonly _options: SingleUse.Options;
    constructor(_options?: SingleUse.Options);
    /**
     * Generate a time limited single-use token with embedded authentication for frontend clients.
     *
     * @param {ElevenLabs.SingleUseTokenType} token_type
     * @param {SingleUse.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.tokens.singleUse.create("realtime_scribe")
     */
    create(token_type: ElevenLabs.SingleUseTokenType, requestOptions?: SingleUse.RequestOptions): core.HttpResponsePromise<ElevenLabs.SingleUseTokenResponseModel>;
    private __create;
}
