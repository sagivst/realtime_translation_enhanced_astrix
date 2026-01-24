import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace KnowledgeBase {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class KnowledgeBase {
    protected readonly _options: KnowledgeBase.Options;
    constructor(_options?: KnowledgeBase.Options);
    /**
     * Returns the number of pages in the agent's knowledge base.
     *
     * @param {string} agent_id
     * @param {KnowledgeBase.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.knowledgeBase.size("agent_id")
     */
    size(agent_id: string, requestOptions?: KnowledgeBase.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentKnowledgebaseSizeResponseModel>;
    private __size;
}
