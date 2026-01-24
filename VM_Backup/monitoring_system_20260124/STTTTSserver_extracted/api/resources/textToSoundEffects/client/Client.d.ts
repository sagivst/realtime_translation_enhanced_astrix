import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace TextToSoundEffects {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class TextToSoundEffects {
    protected readonly _options: TextToSoundEffects.Options;
    constructor(_options?: TextToSoundEffects.Options);
    /**
     * Turn text into sound effects for your videos, voice-overs or video games using the most advanced sound effects models in the world.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    convert(request: ElevenLabs.CreateSoundEffectRequest, requestOptions?: TextToSoundEffects.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __convert;
}
