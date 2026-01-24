import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
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
     * Calculates expected number of LLM tokens needed for the specified agent.
     *
     * @param {string} agent_id
     * @param {ElevenLabs.conversationalAi.agents.LlmUsageCalculatorRequestModel} request
     * @param {LlmUsage.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.llmUsage.calculate("agent_id")
     */
    calculate(agent_id: string, request?: ElevenLabs.conversationalAi.agents.LlmUsageCalculatorRequestModel, requestOptions?: LlmUsage.RequestOptions): core.HttpResponsePromise<ElevenLabs.LlmUsageCalculatorResponseModel>;
    private __calculate;
}
