import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Settings {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Settings {
    protected readonly _options: Settings.Options;
    constructor(_options?: Settings.Options);
    /**
     * Retrieve Convai settings for the workspace
     *
     * @param {Settings.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.settings.get()
     */
    get(requestOptions?: Settings.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConvAiSettingsResponseModel>;
    private __get;
    /**
     * Update Convai settings for the workspace
     *
     * @param {ElevenLabs.conversationalAi.PatchConvAiSettingsRequest} request
     * @param {Settings.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.settings.update()
     */
    update(request?: ElevenLabs.conversationalAi.PatchConvAiSettingsRequest, requestOptions?: Settings.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConvAiSettingsResponseModel>;
    private __update;
}
