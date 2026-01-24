import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace SpeechToSpeech {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class SpeechToSpeech {
    protected readonly _options: SpeechToSpeech.Options;
    constructor(_options?: SpeechToSpeech.Options);
    /**
     * Transform audio from one voice to another. Maintain full control over emotion, timing and delivery.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    convert(voice_id: string, request: ElevenLabs.BodySpeechToSpeechV1SpeechToSpeechVoiceIdPost, requestOptions?: SpeechToSpeech.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __convert;
    /**
     * Stream audio from one voice to another. Maintain full control over emotion, timing and delivery.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(voice_id: string, request: ElevenLabs.BodySpeechToSpeechStreamingV1SpeechToSpeechVoiceIdStreamPost, requestOptions?: SpeechToSpeech.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
}
