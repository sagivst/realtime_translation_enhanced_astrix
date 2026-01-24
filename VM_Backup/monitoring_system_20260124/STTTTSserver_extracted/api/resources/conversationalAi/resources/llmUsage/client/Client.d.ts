import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace LlmUsage {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class LlmUsage {
    protected readonly _options: LlmUsage.Options;
    constructor(_options?: LlmUsage.Options);
    /**
     * Returns a list of LLM models and the expected cost for using them based on the provided values.
     *
     * @param {ElevenLabs.conversationalAi.LlmUsageCalculatorPublicRequestModel} request
     * @param {LlmUsage.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.llmUsage.calculate({
     *         promptLength: 1,
     *         numberOfPages: 1,
     *         ragEnabled: true
     *     })
     */
    calculate(request: ElevenLabs.conversationalAi.LlmUsageCalculatorPublicRequestModel, requestOptions?: LlmUsage.RequestOptions): core.HttpResponsePromise<ElevenLabs.LlmUsageCalculatorResponseModel>;
    private __calculate;
}
