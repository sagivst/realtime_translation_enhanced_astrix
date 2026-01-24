import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
import { Audio } from "../resources/audio/client/Client";
import { Speakers } from "../resources/speakers/client/Client";
import { Waveform } from "../resources/waveform/client/Client";
export declare namespace Samples {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Samples {
    protected readonly _options: Samples.Options;
    protected _audio: Audio | undefined;
    protected _waveform: Waveform | undefined;
    protected _speakers: Speakers | undefined;
    constructor(_options?: Samples.Options);
    get audio(): Audio;
    get waveform(): Waveform;
    get speakers(): Speakers;
    /**
     * Add audio samples to a PVC voice
     *
     * @param {string} voice_id
     * @param {ElevenLabs.voices.pvc.BodyAddSamplesToPvcVoiceV1VoicesPvcVoiceIdSamplesPost} request
     * @param {Samples.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.voices.pvc.samples.create("21m00Tcm4TlvDq8ikWAM", {
     *         files: [fs.createReadStream("/path/to/your/file")]
     *     })
     */
    create(voice_id: string, request: ElevenLabs.voices.pvc.BodyAddSamplesToPvcVoiceV1VoicesPvcVoiceIdSamplesPost, requestOptions?: Samples.RequestOptions): core.HttpResponsePromise<ElevenLabs.VoiceSample[]>;
    private __create;
    /**
     * Update a PVC voice sample - apply noise removal, select speaker, change trim times or file name.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {ElevenLabs.voices.pvc.BodyUpdatePvcVoiceSampleV1VoicesPvcVoiceIdSamplesSampleIdPost} request
     * @param {Samples.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.update("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L")
     */
    update(voice_id: string, sample_id: string, request?: ElevenLabs.voices.pvc.BodyUpdatePvcVoiceSampleV1VoicesPvcVoiceIdSamplesSampleIdPost, requestOptions?: Samples.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddVoiceResponseModel>;
    private __update;
    /**
     * Delete a sample from a PVC voice.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {Samples.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.delete("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L")
     */
    delete(voice_id: string, sample_id: string, requestOptions?: Samples.RequestOptions): core.HttpResponsePromise<ElevenLabs.DeleteVoiceSampleResponseModel>;
    private __delete;
}
