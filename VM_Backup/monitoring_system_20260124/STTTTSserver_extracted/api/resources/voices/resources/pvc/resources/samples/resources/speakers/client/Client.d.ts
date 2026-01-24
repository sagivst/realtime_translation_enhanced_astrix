import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../index";
import { Audio } from "../resources/audio/client/Client";
export declare namespace Speakers {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Speakers {
    protected readonly _options: Speakers.Options;
    protected _audio: Audio | undefined;
    constructor(_options?: Speakers.Options);
    get audio(): Audio;
    /**
     * Retrieve the status of the speaker separation process and the list of detected speakers if complete.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {Speakers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.speakers.get("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L")
     */
    get(voice_id: string, sample_id: string, requestOptions?: Speakers.RequestOptions): core.HttpResponsePromise<ElevenLabs.SpeakerSeparationResponseModel>;
    private __get;
    /**
     * Start speaker separation process for a sample
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {Speakers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.speakers.separate("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L")
     */
    separate(voice_id: string, sample_id: string, requestOptions?: Speakers.RequestOptions): core.HttpResponsePromise<ElevenLabs.StartSpeakerSeparationResponseModel>;
    private __separate;
}
