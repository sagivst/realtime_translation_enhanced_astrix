import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
export declare namespace Preview {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Preview {
    protected readonly _options: Preview.Options;
    constructor(_options?: Preview.Options);
    /**
     * Stream a voice preview that was created via the /v1/text-to-voice/design endpoint.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(generated_voice_id: string, requestOptions?: Preview.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
}
