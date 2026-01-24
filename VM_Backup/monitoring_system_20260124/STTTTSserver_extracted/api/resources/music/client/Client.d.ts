import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { CompositionPlan } from "../resources/compositionPlan/client/Client";
export declare namespace Music {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Music {
    protected readonly _options: Music.Options;
    protected _compositionPlan: CompositionPlan | undefined;
    constructor(_options?: Music.Options);
    get compositionPlan(): CompositionPlan;
    /**
     * Compose a song from a prompt or a composition plan.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    compose(request?: ElevenLabs.BodyComposeMusicV1MusicPost, requestOptions?: Music.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __compose;
    /**
     * Compose a song from a prompt or a composition plan.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    composeDetailed(request?: ElevenLabs.BodyComposeMusicWithADetailedResponseV1MusicDetailedPost, requestOptions?: Music.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __composeDetailed;
    /**
     * Stream a composed song from a prompt or a composition plan.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(request?: ElevenLabs.BodyStreamComposedMusicV1MusicStreamPost, requestOptions?: Music.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
    /**
     * Separate an audio file into individual stems. This endpoint might have high latency, depending on the length of the audio file.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    separateStems(request: ElevenLabs.BodyStemSeparationV1MusicStemSeparationPost, requestOptions?: Music.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __separateStems;
}
