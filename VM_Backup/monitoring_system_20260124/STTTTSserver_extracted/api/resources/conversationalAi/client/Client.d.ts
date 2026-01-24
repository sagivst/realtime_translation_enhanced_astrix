import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { Agents } from "../resources/agents/client/Client";
import { BatchCalls } from "../resources/batchCalls/client/Client";
import { Conversations } from "../resources/conversations/client/Client";
import { Dashboard } from "../resources/dashboard/client/Client";
import { KnowledgeBase } from "../resources/knowledgeBase/client/Client";
import { LlmUsage } from "../resources/llmUsage/client/Client";
import { McpServers } from "../resources/mcpServers/client/Client";
import { PhoneNumbers } from "../resources/phoneNumbers/client/Client";
import { Secrets } from "../resources/secrets/client/Client";
import { Settings } from "../resources/settings/client/Client";
import { SipTrunk } from "../resources/sipTrunk/client/Client";
import { Tests } from "../resources/tests/client/Client";
import { Tools } from "../resources/tools/client/Client";
import { Twilio } from "../resources/twilio/client/Client";
export declare namespace ConversationalAi {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ConversationalAi {
    protected readonly _options: ConversationalAi.Options;
    protected _conversations: Conversations | undefined;
    protected _twilio: Twilio | undefined;
    protected _agents: Agents | undefined;
    protected _tests: Tests | undefined;
    protected _phoneNumbers: PhoneNumbers | undefined;
    protected _llmUsage: LlmUsage | undefined;
    protected _knowledgeBase: KnowledgeBase | undefined;
    protected _tools: Tools | undefined;
    protected _settings: Settings | undefined;
    protected _secrets: Secrets | undefined;
    protected _batchCalls: BatchCalls | undefined;
    protected _sipTrunk: SipTrunk | undefined;
    protected _mcpServers: McpServers | undefined;
    protected _dashboard: Dashboard | undefined;
    constructor(_options?: ConversationalAi.Options);
    get conversations(): Conversations;
    get twilio(): Twilio;
    get agents(): Agents;
    get tests(): Tests;
    get phoneNumbers(): PhoneNumbers;
    get llmUsage(): LlmUsage;
    get knowledgeBase(): KnowledgeBase;
    get tools(): Tools;
    get settings(): Settings;
    get secrets(): Secrets;
    get batchCalls(): BatchCalls;
    get sipTrunk(): SipTrunk;
    get mcpServers(): McpServers;
    get dashboard(): Dashboard;
    /**
     * Upload a file or webpage URL to create a knowledge base document. <br> <Note> After creating the document, update the agent's knowledge base by calling [Update agent](/docs/api-reference/agents/update). </Note>
     *
     * @param {ElevenLabs.BodyAddToKnowledgeBaseV1ConvaiKnowledgeBasePost} request
     * @param {ConversationalAi.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.conversationalAi.addToKnowledgeBase({
     *         agentId: "agent_id"
     *     })
     */
    addToKnowledgeBase(request: ElevenLabs.BodyAddToKnowledgeBaseV1ConvaiKnowledgeBasePost, requestOptions?: ConversationalAi.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddKnowledgeBaseResponseModel>;
    private __addToKnowledgeBase;
    /**
     * Provides information about all RAG indexes of the specified knowledgebase document.
     *
     * @param {string} documentation_id - The id of a document from the knowledge base. This is returned on document addition.
     * @param {ConversationalAi.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.getDocumentRagIndexes("21m00Tcm4TlvDq8ikWAM")
     */
    getDocumentRagIndexes(documentation_id: string, requestOptions?: ConversationalAi.RequestOptions): core.HttpResponsePromise<ElevenLabs.RagDocumentIndexesResponseModel>;
    private __getDocumentRagIndexes;
    /**
     * Delete RAG index for the knowledgebase document.
     *
     * @param {string} documentation_id - The id of a document from the knowledge base. This is returned on document addition.
     * @param {string} rag_index_id - The id of RAG index of document from the knowledge base.
     * @param {ConversationalAi.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.deleteDocumentRagIndex("21m00Tcm4TlvDq8ikWAM", "21m00Tcm4TlvDq8ikWAM")
     */
    deleteDocumentRagIndex(documentation_id: string, rag_index_id: string, requestOptions?: ConversationalAi.RequestOptions): core.HttpResponsePromise<ElevenLabs.RagDocumentIndexResponseModel>;
    private __deleteDocumentRagIndex;
    /**
     * Provides total size and other information of RAG indexes used by knowledgebase documents
     *
     * @param {ConversationalAi.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.ragIndexOverview()
     */
    ragIndexOverview(requestOptions?: ConversationalAi.RequestOptions): core.HttpResponsePromise<ElevenLabs.RagIndexOverviewResponseModel>;
    private __ragIndexOverview;
}
