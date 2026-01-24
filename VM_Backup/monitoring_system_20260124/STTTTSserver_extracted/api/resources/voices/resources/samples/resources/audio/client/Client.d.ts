import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
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
     * Returns the audio corresponding to a sample attached to a voice.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    get(voice_id: string, sample_id: string, requestOptions?: Audio.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __get;
}
