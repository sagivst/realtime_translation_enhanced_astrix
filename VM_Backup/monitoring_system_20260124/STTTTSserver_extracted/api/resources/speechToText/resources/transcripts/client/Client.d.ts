import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Transcripts {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Transcripts {
    protected readonly _options: Transcripts.Options;
    constructor(_options?: Transcripts.Options);
    /**
     * Retrieve a previously generated transcript by its ID.
     *
     * @param {string} transcription_id - The unique ID of the transcript to retrieve
     * @param {Transcripts.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnauthorizedError}
     * @throws {@link ElevenLabs.NotFoundError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.speechToText.transcripts.get("transcription_id")
     */
    get(transcription_id: string, requestOptions?: Transcripts.RequestOptions): core.HttpResponsePromise<ElevenLabs.speechToText.TranscriptsGetResponse>;
    private __get;
    /**
     * Delete a previously generated transcript by its ID.
     *
     * @param {string} transcription_id - The unique ID of the transcript to delete
     * @param {Transcripts.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnauthorizedError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.speechToText.transcripts.delete("transcription_id")
     */
    delete(transcription_id: string, requestOptions?: Transcripts.RequestOptions): core.HttpResponsePromise<unknown>;
    private __delete;
}
