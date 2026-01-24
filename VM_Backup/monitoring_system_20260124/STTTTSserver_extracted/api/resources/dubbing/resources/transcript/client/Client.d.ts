import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Transcript {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Transcript {
    protected readonly _options: Transcript.Options;
    constructor(_options?: Transcript.Options);
    /**
     * Returns transcript for the dub as an SRT or WEBVTT file.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {string} language_code - ID of the language.
     * @param {ElevenLabs.dubbing.TranscriptGetTranscriptForDubRequest} request
     * @param {Transcript.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.ForbiddenError}
     * @throws {@link ElevenLabs.NotFoundError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     * @throws {@link ElevenLabs.TooEarlyError}
     *
     * @example
     *     await client.dubbing.transcript.getTranscriptForDub("dubbing_id", "language_code", {
     *         formatType: "srt"
     *     })
     */
    getTranscriptForDub(dubbing_id: string, language_code: string, request?: ElevenLabs.dubbing.TranscriptGetTranscriptForDubRequest, requestOptions?: Transcript.RequestOptions): core.HttpResponsePromise<ElevenLabs.dubbing.TranscriptGetTranscriptForDubResponse>;
    private __getTranscriptForDub;
}
