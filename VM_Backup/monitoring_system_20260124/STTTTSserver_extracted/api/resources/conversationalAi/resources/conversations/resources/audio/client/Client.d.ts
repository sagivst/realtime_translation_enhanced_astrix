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
     * Get the audio recording of a particular conversation
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    get(conversation_id: string, requestOptions?: Audio.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __get;
}
