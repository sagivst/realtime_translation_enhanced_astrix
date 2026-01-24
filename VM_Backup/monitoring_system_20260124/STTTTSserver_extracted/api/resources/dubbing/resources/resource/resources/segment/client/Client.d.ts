import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
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
     * Modifies a single segment with new text and/or start/end times. Will update the values for only a specific language of a segment. Does not automatically regenerate the dub.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} segment_id - ID of the segment
     * @param {string} language - ID of the language.
     * @param {ElevenLabs.dubbing.resource.SegmentUpdatePayload} request
     * @param {Segment.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.segment.update("dubbing_id", "segment_id", "language")
     */
    update(dubbing_id: string, segment_id: string, language: string, request?: ElevenLabs.dubbing.resource.SegmentUpdatePayload, requestOptions?: Segment.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentUpdateResponse>;
    private __update;
    /**
     * Deletes a single segment from the dubbing.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} segment_id - ID of the segment
     * @param {Segment.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.segment.delete("dubbing_id", "segment_id")
     */
    delete(dubbing_id: string, segment_id: string, requestOptions?: Segment.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentDeleteResponse>;
    private __delete;
}
