import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../index";
export declare namespace Segment {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Segment {
    protected readonly _options: Segment.Options;
    constructor(_options?: Segment.Options);
    /**
     * Creates a new segment in dubbing resource with a start and end time for the speaker in every available language. Does not automatically generate transcripts/translations/audio.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} speaker_id - ID of the speaker.
     * @param {ElevenLabs.dubbing.resource.speaker.SegmentCreatePayload} request
     * @param {Segment.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.speaker.segment.create("dubbing_id", "speaker_id", {
     *         startTime: 1.1,
     *         endTime: 1.1
     *     })
     */
    create(dubbing_id: string, speaker_id: string, request: ElevenLabs.dubbing.resource.speaker.SegmentCreatePayload, requestOptions?: Segment.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentCreateResponse>;
    private __create;
}
