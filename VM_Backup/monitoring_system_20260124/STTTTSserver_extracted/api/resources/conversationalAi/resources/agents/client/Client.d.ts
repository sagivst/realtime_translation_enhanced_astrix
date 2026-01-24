import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { KnowledgeBase } from "../resources/knowledgeBase/client/Client";
import { Link } from "../resources/link/client/Client";
import { LlmUsage } from "../resources/llmUsage/client/Client";
import { Widget } from "../resources/widget/client/Client";
export declare namespace Agents {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Agents {
    protected readonly _options: Agents.Options;
    protected _widget: Widget | undefined;
    protected _link: Link | undefined;
    protected _knowledgeBase: KnowledgeBase | undefined;
    protected _llmUsage: LlmUsage | undefined;
    constructor(_options?: Agents.Options);
    get widget(): Widget;
    get link(): Link;
    get knowledgeBase(): KnowledgeBase;
    get llmUsage(): LlmUsage;
    /**
     * Create an agent from a config object
     *
     * @param {ElevenLabs.conversationalAi.BodyCreateAgentV1ConvaiAgentsCreatePost} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.create({
     *         conversationConfig: {}
     *     })
     */
    create(request: ElevenLabs.conversationalAi.BodyCreateAgentV1ConvaiAgentsCreatePost, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.CreateAgentResponseModel>;
    private __create;
    /**
     * Retrieve config for an agent
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.get("agent_3701k3ttaq12ewp8b7qv5rfyszkz")
     */
    get(agent_id: string, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentResponseModel>;
    private __get;
    /**
     * Delete an agent
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.delete("agent_3701k3ttaq12ewp8b7qv5rfyszkz")
     */
    delete(agent_id: string, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<void>;
    private __delete;
    /**
     * Patches an Agent settings
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.UpdateAgentRequest} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.update("agent_3701k3ttaq12ewp8b7qv5rfyszkz")
     */
    update(agent_id: string, request?: ElevenLabs.conversationalAi.UpdateAgentRequest, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentResponseModel>;
    private __update;
    /**
     * Returns a list of your agents and their metadata.
     *
     * @param {ElevenLabs.conversationalAi.AgentsListRequest} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.list({
     *         pageSize: 1,
     *         search: "search",
     *         archived: true,
     *         sortDirection: "asc",
     *         sortBy: "name",
     *         cursor: "cursor"
     *     })
     */
    list(request?: ElevenLabs.conversationalAi.AgentsListRequest, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentsPageResponseModel>;
    private __list;
    /**
     * Create a new agent by duplicating an existing one
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.BodyDuplicateAgentV1ConvaiAgentsAgentIdDuplicatePost} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.duplicate("agent_3701k3ttaq12ewp8b7qv5rfyszkz")
     */
    duplicate(agent_id: string, request?: ElevenLabs.conversationalAi.BodyDuplicateAgentV1ConvaiAgentsAgentIdDuplicatePost, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.CreateAgentResponseModel>;
    private __duplicate;
    /**
     * Run a conversation between the agent and a simulated user.
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.BodySimulatesAConversationV1ConvaiAgentsAgentIdSimulateConversationPost} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.simulateConversation("agent_3701k3ttaq12ewp8b7qv5rfyszkz", {
     *         simulationSpecification: {
     *             simulatedUserConfig: {
     *                 firstMessage: "Hello, how can I help you today?",
     *                 language: "en",
     *                 disableFirstMessageInterruptions: false
     *             }
     *         }
     *     })
     */
    simulateConversation(agent_id: string, request: ElevenLabs.conversationalAi.BodySimulatesAConversationV1ConvaiAgentsAgentIdSimulateConversationPost, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.AgentSimulatedChatTestResponseModel>;
    private __simulateConversation;
    /**
     * Run a conversation between the agent and a simulated user and stream back the response. Response is streamed back as partial lists of messages that should be concatenated and once the conversation has complete a single final message with the conversation analysis will be sent.
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.BodySimulatesAConversationStreamV1ConvaiAgentsAgentIdSimulateConversationStreamPost} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.simulateConversationStream("agent_3701k3ttaq12ewp8b7qv5rfyszkz", {
     *         simulationSpecification: {
     *             simulatedUserConfig: {
     *                 firstMessage: "Hello, how can I help you today?",
     *                 language: "en",
     *                 disableFirstMessageInterruptions: false
     *             }
     *         }
     *     })
     */
    simulateConversationStream(agent_id: string, request: ElevenLabs.conversationalAi.BodySimulatesAConversationStreamV1ConvaiAgentsAgentIdSimulateConversationStreamPost, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<void>;
    private __simulateConversationStream;
    /**
     * Run selected tests on the agent with provided configuration. If the agent configuration is provided, it will be used to override default agent configuration.
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.RunAgentTestsRequestModel} request
     * @param {Agents.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.runTests("agent_3701k3ttaq12ewp8b7qv5rfyszkz", {
     *         tests: [{
     *                 testId: "test_id"
     *             }]
     *     })
     */
    runTests(agent_id: string, request: ElevenLabs.conversationalAi.RunAgentTestsRequestModel, requestOptions?: Agents.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetTestSuiteInvocationResponseModel>;
    private __runTests;
}
