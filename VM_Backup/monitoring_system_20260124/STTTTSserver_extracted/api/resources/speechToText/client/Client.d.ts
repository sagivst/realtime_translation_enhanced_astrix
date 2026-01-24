import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { Transcripts } from "../resources/transcripts/client/Client";
export declare namespace SpeechToText {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class SpeechToText {
    protected readonly _options: SpeechToText.Options;
    protected _transcripts: Transcripts | undefined;
    constructor(_options?: SpeechToText.Options);
    get transcripts(): Transcripts;
    /**
     * Transcribe an audio or video file. If webhook is set to true, the request will be processed asynchronously and results sent to configured webhooks. When use_multi_channel is true and the provided audio has multiple channels, a 'transcripts' object with separate transcripts for each channel is returned. Otherwise, returns a single transcript. The optional webhook_metadata parameter allows you to attach custom data that will be included in webhook responses for request correlation and tracking.
     *
     * @param {ElevenLabs.BodySpeechToTextV1SpeechToTextPost} request
     * @param {SpeechToText.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.speechToText.convert({
     *         enableLogging: true,
     *         modelId: "model_id"
     *     })
     */
    convert(request: ElevenLabs.BodySpeechToTextV1SpeechToTextPost, requestOptions?: SpeechToText.RequestOptions): core.HttpResponsePromise<ElevenLabs.SpeechToTextConvertResponse>;
    private __convert;
}
