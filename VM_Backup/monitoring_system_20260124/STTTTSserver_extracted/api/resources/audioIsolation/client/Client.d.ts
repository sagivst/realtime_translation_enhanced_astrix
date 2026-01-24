import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace AudioIsolation {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class AudioIsolation {
    protected readonly _options: AudioIsolation.Options;
    constructor(_options?: AudioIsolation.Options);
    /**
     * Removes background noise from audio.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    convert(request: ElevenLabs.BodyAudioIsolationV1AudioIsolationPost, requestOptions?: AudioIsolation.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __convert;
    /**
     * Removes background noise from audio.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(request: ElevenLabs.BodyAudioIsolationStreamV1AudioIsolationStreamPost, requestOptions?: AudioIsolation.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
}
