import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace TextToDialogue {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class TextToDialogue {
    protected readonly _options: TextToDialogue.Options;
    constructor(_options?: TextToDialogue.Options);
    /**
     * Converts a list of text and voice ID pairs into speech (dialogue) and returns audio.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    convert(request: ElevenLabs.BodyTextToDialogueMultiVoiceV1TextToDialoguePost, requestOptions?: TextToDialogue.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __convert;
    /**
     * Converts a list of text and voice ID pairs into speech (dialogue) and returns an audio stream.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(request: ElevenLabs.BodyTextToDialogueMultiVoiceStreamingV1TextToDialogueStreamPost, requestOptions?: TextToDialogue.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
    /**
     * Converts a list of text and voice ID pairs into speech (dialogue) and returns a stream of JSON blobs containing audio as a base64 encoded string and timestamps
     */
    streamWithTimestamps(request: ElevenLabs.BodyTextToDialogueStreamWithTimestamps, requestOptions?: TextToDialogue.RequestOptions): core.HttpResponsePromise<core.Stream<ElevenLabs.StreamingAudioChunkWithTimestampsAndVoiceSegmentsResponseModel>>;
    private __streamWithTimestamps;
    /**
     * Generate dialogue from text with precise character-level timing information for audio-text synchronization.
     *
     * @param {ElevenLabs.BodyTextToDialogueFullWithTimestamps} request
     * @param {TextToDialogue.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.textToDialogue.convertWithTimestamps({
     *         outputFormat: "mp3_22050_32",
     *         inputs: [{
     *                 text: "Hello, how are you?",
     *                 voiceId: "bYTqZQo3Jz7LQtmGTgwi"
     *             }, {
     *                 text: "I'm doing well, thank you!",
     *                 voiceId: "6lCwbsX1yVjD49QmpkTR"
     *             }]
     *     })
     */
    convertWithTimestamps(request: ElevenLabs.BodyTextToDialogueFullWithTimestamps, requestOptions?: TextToDialogue.RequestOptions): core.HttpResponsePromise<ElevenLabs.AudioWithTimestampsAndVoiceSegmentsResponseModel>;
    private __convertWithTimestamps;
}
