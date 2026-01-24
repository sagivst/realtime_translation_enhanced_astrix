import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../index";
export declare namespace Audio {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Audio {
    protected readonly _options: Audio.Options;
    constructor(_options?: Audio.Options);
    /**
     * Retrieve the first 30 seconds of voice sample audio with or without noise removal.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {ElevenLabs.voices.pvc.samples.AudioGetRequest} request
     * @param {Audio.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.audio.get("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L", {
     *         removeBackgroundNoise: true
     *     })
     */
    get(voice_id: string, sample_id: string, request?: ElevenLabs.voices.pvc.samples.AudioGetRequest, requestOptions?: Audio.RequestOptions): core.HttpResponsePromise<ElevenLabs.VoiceSamplePreviewResponseModel>;
    private __get;
}
