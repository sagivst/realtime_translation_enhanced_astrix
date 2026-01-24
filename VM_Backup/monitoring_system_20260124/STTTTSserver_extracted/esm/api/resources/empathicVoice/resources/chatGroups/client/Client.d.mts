import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient.mjs";
import * as core from "../../../../../../core/index.mjs";
import * as Hume from "../../../../../index.mjs";
export declare namespace ChatGroups {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ChatGroups {
    protected readonly _options: ChatGroups.Options;
    constructor(_options?: ChatGroups.Options);
    /**
     * Fetches a paginated list of **Chat Groups**.
     *
     * @param {Hume.empathicVoice.ChatGroupsListChatGroupsRequest} request
     * @param {ChatGroups.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chatGroups.listChatGroups({
     *         pageNumber: 0,
     *         pageSize: 1,
     *         ascendingOrder: true,
     *         configId: "1b60e1a0-cc59-424a-8d2c-189d354db3f3"
     *     })
     */
    listChatGroups(request?: Hume.empathicVoice.ChatGroupsListChatGroupsRequest, requestOptions?: ChatGroups.RequestOptions): Promise<core.Page<Hume.empathicVoice.ReturnChatGroup, Hume.empathicVoice.ReturnPagedChatGroups>>;
    /**
     * Fetches a **ChatGroup** by ID, including a paginated list of **Chats** associated with the **ChatGroup**.
     *
     * @param {string} id - Identifier for a Chat Group. Formatted as a UUID.
     * @param {Hume.empathicVoice.ChatGroupsGetChatGroupRequest} request
     * @param {ChatGroups.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chatGroups.getChatGroup("697056f0-6c7e-487d-9bd8-9c19df79f05f", {
     *         pageNumber: 0,
     *         pageSize: 1,
     *         ascendingOrder: true
     *     })
     */
    getChatGroup(id: string, request?: Hume.empathicVoice.ChatGroupsGetChatGroupRequest, requestOptions?: ChatGroups.RequestOptions): core.HttpResponsePromise<Hume.empathicVoice.ReturnChatGroupPagedChats>;
    private __getChatGroup;
    /**
     * Fetches a paginated list of audio for each **Chat** within the specified **Chat Group**. For more details, see our guide on audio reconstruction [here](/docs/speech-to-speech-evi/faq#can-i-access-the-audio-of-previous-conversations-with-evi).
     *
     * @param {string} id - Identifier for a Chat Group. Formatted as a UUID.
     * @param {Hume.empathicVoice.ChatGroupsGetAudioRequest} request
     * @param {ChatGroups.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chatGroups.getAudio("369846cf-6ad5-404d-905e-a8acb5cdfc78", {
     *         pageNumber: 0,
     *         pageSize: 10,
     *         ascendingOrder: true
     *     })
     */
    getAudio(id: string, request?: Hume.empathicVoice.ChatGroupsGetAudioRequest, requestOptions?: ChatGroups.RequestOptions): core.HttpResponsePromise<Hume.empathicVoice.ReturnChatGroupPagedAudioReconstructions>;
    private __getAudio;
    /**
     * Fetches a paginated list of **Chat** events associated with a **Chat Group**.
     *
     * @param {string} id - Identifier for a Chat Group. Formatted as a UUID.
     * @param {Hume.empathicVoice.ChatGroupsListChatGroupEventsRequest} request
     * @param {ChatGroups.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chatGroups.listChatGroupEvents("697056f0-6c7e-487d-9bd8-9c19df79f05f", {
     *         pageNumber: 0,
     *         pageSize: 3,
     *         ascendingOrder: true
     *     })
     */
    listChatGroupEvents(id: string, request?: Hume.empathicVoice.ChatGroupsListChatGroupEventsRequest, requestOptions?: ChatGroups.RequestOptions): Promise<core.Page<Hume.empathicVoice.ReturnChatEvent, Hume.empathicVoice.ReturnChatGroupPagedEvents>>;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
