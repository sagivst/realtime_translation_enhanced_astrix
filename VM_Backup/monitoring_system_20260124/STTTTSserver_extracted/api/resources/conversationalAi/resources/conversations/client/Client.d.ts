import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Audio } from "../resources/audio/client/Client";
import { Feedback } from "../resources/feedback/client/Client";
export declare namespace Conversations {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Conversations {
    protected readonly _options: Conversations.Options;
    protected _audio: Audio | undefined;
    protected _feedback: Feedback | undefined;
    constructor(_options?: Conversations.Options);
    get audio(): Audio;
    get feedback(): Feedback;
    /**
     * Get a signed url to start a conversation with an agent with an agent that requires authorization
     *
     * @param {ElevenLabs.conversationalAi.ConversationsGetSignedUrlRequest} request
     * @param {Conversations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.conversations.getSignedUrl({
     *         agentId: "21m00Tcm4TlvDq8ikWAM",
     *         includeConversationId: true
     *     })
     */
    getSignedUrl(request: ElevenLabs.conversationalAi.ConversationsGetSignedUrlRequest, requestOptions?: Conversations.RequestOptions): core.HttpResponsePromise<ElevenLabs.ConversationSignedUrlResponseModel>;
    private __getSignedUrl;
    /**
     * Get a WebRTC session token for real-time communication.
     *
     * @param {ElevenLabs.conversationalAi.ConversationsGetWebrtcTokenRequest} request
     * @param {Conversations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.conversations.getWebrtcToken({
     *         agentId: "21m00Tcm4TlvDq8ikWAM",
     *         participantName: "participant_name"
     *     })
     */
    getWebrtcToken(request: ElevenLabs.conversationalAi.ConversationsGetWebrtcTokenRequest, requestOptions?: Conversations.RequestOptions): core.HttpResponsePromise<ElevenLabs.TokenResponseModel>;
    private __getWebrtcToken;
    /**
     * Get all conversations of agents that user owns. With option to restrict to a specific agent.
     *
     * @param {ElevenLabs.conversationalAi.ConversationsListRequest} request
     * @param {Conversations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.conversations.list({
     *         cursor: "cursor",
     *         agentId: "agent_id",
     *         callSuccessful: "success",
     *         callStartBeforeUnix: 1,
     *         callStartAfterUnix: 1,
     *         callDurationMinSecs: 1,
     *         callDurationMaxSecs: 1,
     *         userId: "user_id",
     *         pageSize: 1,
     *         summaryMode: "exclude",
     *         search: "search"
     *     })
     */
    list(request?: ElevenLabs.conversationalAi.ConversationsListRequest, requestOptions?: Conversations.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConversationsPageResponseModel>;
    private __list;
    /**
     * Get the details of a particular conversation
     *
     * @param {string} conversation_id - The id of the conversation you're taking the action on.
     * @param {Conversations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.conversations.get("123")
     */
    get(conversation_id: string, requestOptions?: Conversations.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetConversationResponseModel>;
    private __get;
    /**
     * Delete a particular conversation
     *
     * @param {string} conversation_id - The id of the conversation you're taking the action on.
     * @param {Conversations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.conversations.delete("21m00Tcm4TlvDq8ikWAM")
     */
    delete(conversation_id: string, requestOptions?: Conversations.RequestOptions): core.HttpResponsePromise<unknown>;
    private __delete;
}
