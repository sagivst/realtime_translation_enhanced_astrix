import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient.js";
import * as core from "../../../../../../core/index.js";
import * as Hume from "../../../../../index.js";
export declare namespace Voices {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Voices {
    protected readonly _options: Voices.Options;
    constructor(_options?: Voices.Options);
    /**
     * Lists voices you have saved in your account, or voices from the [Voice Library](https://platform.hume.ai/tts/voice-library).
     *
     * @param {Hume.tts.VoicesListRequest} request
     * @param {Voices.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.tts.BadRequestError}
     *
     * @example
     *     await client.tts.voices.list({
     *         provider: "CUSTOM_VOICE"
     *     })
     */
    list(request: Hume.tts.VoicesListRequest, requestOptions?: Voices.RequestOptions): Promise<core.Page<Hume.tts.ReturnVoice, Hume.tts.ReturnPagedVoices>>;
    /**
     * Saves a new custom voice to your account using the specified TTS generation ID.
     *
     * Once saved, this voice can be reused in subsequent TTS requests, ensuring consistent speech style and prosody. For more details on voice creation, see the [Voices Guide](/docs/text-to-speech-tts/voices).
     *
     * @param {Hume.tts.PostedVoice} request
     * @param {Voices.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.tts.UnprocessableEntityError}
     *
     * @example
     *     await client.tts.voices.create({
     *         generationId: "795c949a-1510-4a80-9646-7d0863b023ab",
     *         name: "David Hume"
     *     })
     */
    create(request: Hume.tts.PostedVoice, requestOptions?: Voices.RequestOptions): core.HttpResponsePromise<Hume.tts.ReturnVoice>;
    private __create;
    /**
     * Deletes a previously generated custom voice.
     *
     * @param {Hume.tts.VoicesDeleteRequest} request
     * @param {Voices.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.tts.BadRequestError}
     *
     * @example
     *     await client.tts.voices.delete({
     *         name: "David Hume"
     *     })
     */
    delete(request: Hume.tts.VoicesDeleteRequest, requestOptions?: Voices.RequestOptions): core.HttpResponsePromise<void>;
    private __delete;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
