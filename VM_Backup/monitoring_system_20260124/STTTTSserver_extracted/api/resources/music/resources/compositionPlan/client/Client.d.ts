import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace CompositionPlan {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class CompositionPlan {
    protected readonly _options: CompositionPlan.Options;
    constructor(_options?: CompositionPlan.Options);
    /**
     * Create a composition plan for music generation. Usage of this endpoint does not cost any credits but is subject to rate limiting depending on your tier.
     *
     * @param {ElevenLabs.music.BodyGenerateCompositionPlanV1MusicPlanPost} request
     * @param {CompositionPlan.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.music.compositionPlan.create({
     *         prompt: "prompt"
     *     })
     */
    create(request: ElevenLabs.music.BodyGenerateCompositionPlanV1MusicPlanPost, requestOptions?: CompositionPlan.RequestOptions): core.HttpResponsePromise<ElevenLabs.MusicPrompt>;
    private __create;
}
