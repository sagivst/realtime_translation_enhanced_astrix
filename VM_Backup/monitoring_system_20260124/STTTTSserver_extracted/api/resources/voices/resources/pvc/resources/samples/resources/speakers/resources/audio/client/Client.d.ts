import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../../../index";
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
     * Retrieve the separated audio for a specific speaker.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {string} sample_id - Sample ID to be used
     * @param {string} speaker_id - Speaker ID to be used, you can use GET https://api.elevenlabs.io/v1/voices/{voice_id}/samples/{sample_id}/speakers to list all the available speakers for a sample.
     * @param {Audio.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.samples.speakers.audio.get("21m00Tcm4TlvDq8ikWAM", "VW7YKqPnjY4h39yTbx2L", "VW7YKqPnjY4h39yTbx2L")
     */
    get(voice_id: string, sample_id: string, speaker_id: string, requestOptions?: Audio.RequestOptions): core.HttpResponsePromise<ElevenLabs.SpeakerAudioResponseModel>;
    private __get;
}
