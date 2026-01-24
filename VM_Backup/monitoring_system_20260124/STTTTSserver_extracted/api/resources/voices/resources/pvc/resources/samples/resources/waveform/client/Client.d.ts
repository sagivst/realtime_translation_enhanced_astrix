import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../index";
export declare namespace Waveform {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Waveform {
    protected readonly _options: Waveform.Options;
    constructor(_options?: Waveform.Options);
    /**
     * Retrieve the visual waveform of a voice sample.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {Waveform.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.waveform.get("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L")
     */
    get(voice_id: string, sample_id: string, requestOptions?: Waveform.RequestOptions): core.HttpResponsePromise<ElevenLabs.VoiceSampleVisualWaveformResponseModel>;
    private __get;
}
