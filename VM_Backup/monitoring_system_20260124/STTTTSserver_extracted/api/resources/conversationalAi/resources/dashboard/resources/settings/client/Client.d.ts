import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
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
     * Retrieve Convai dashboard settings for the workspace
     *
     * @param {Settings.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.dashboard.settings.get()
     */
    get(requestOptions?: Settings.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConvAiDashboardSettingsResponseModel>;
    private __get;
    /**
     * Update Convai dashboard settings for the workspace
     *
     * @param {ElevenLabs.conversationalAi.dashboard.PatchConvAiDashboardSettingsRequest} request
     * @param {Settings.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.dashboard.settings.update()
     */
    update(request?: ElevenLabs.conversationalAi.dashboard.PatchConvAiDashboardSettingsRequest, requestOptions?: Settings.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConvAiDashboardSettingsResponseModel>;
    private __update;
}
