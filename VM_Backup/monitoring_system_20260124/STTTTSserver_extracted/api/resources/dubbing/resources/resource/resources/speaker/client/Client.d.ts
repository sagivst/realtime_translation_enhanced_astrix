import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
import { Segment } from "../resources/segment/client/Client";
export declare namespace Speaker {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Speaker {
    protected readonly _options: Speaker.Options;
    protected _segment: Segment | undefined;
    constructor(_options?: Speaker.Options);
    get segment(): Segment;
    /**
     * Amend the metadata associated with a speaker, such as their voice. Both voice cloning and using voices from the ElevenLabs library are supported.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} speaker_id - ID of the speaker.
     * @param {ElevenLabs.dubbing.resource.BodyUpdateMetadataForASpeakerV1DubbingResourceDubbingIdSpeakerSpeakerIdPatch} request
     * @param {Speaker.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.speaker.update("dubbing_id", "speaker_id")
     */
    update(dubbing_id: string, speaker_id: string, request?: ElevenLabs.dubbing.resource.BodyUpdateMetadataForASpeakerV1DubbingResourceDubbingIdSpeakerSpeakerIdPatch, requestOptions?: Speaker.RequestOptions): core.HttpResponsePromise<ElevenLabs.SpeakerUpdatedResponse>;
    private __update;
    /**
     * Fetch the top 10 similar voices to a speaker, including the voice IDs, names, descriptions, and, where possible, a sample audio recording.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} speaker_id - ID of the speaker.
     * @param {Speaker.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.speaker.findSimilarVoices("dubbing_id", "speaker_id")
     */
    findSimilarVoices(dubbing_id: string, speaker_id: string, requestOptions?: Speaker.RequestOptions): core.HttpResponsePromise<ElevenLabs.SimilarVoicesForSpeakerResponse>;
    private __findSimilarVoices;
}
