import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient.js";
import * as core from "../../../../../../core/index.js";
import * as Hume from "../../../../../index.js";
export declare namespace Chats {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Chats {
    protected readonly _options: Chats.Options;
    constructor(_options?: Chats.Options);
    /**
     * Fetches a paginated list of **Chats**.
     *
     * @param {Hume.empathicVoice.ChatsListChatsRequest} request
     * @param {Chats.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chats.listChats({
     *         pageNumber: 0,
     *         pageSize: 1,
     *         ascendingOrder: true
     *     })
     */
    listChats(request?: Hume.empathicVoice.ChatsListChatsRequest, requestOptions?: Chats.RequestOptions): Promise<core.Page<Hume.empathicVoice.ReturnChat, Hume.empathicVoice.ReturnPagedChats>>;
    /**
     * Fetches a paginated list of **Chat** events.
     *
     * @param {string} id - Identifier for a Chat. Formatted as a UUID.
     * @param {Hume.empathicVoice.ChatsListChatEventsRequest} request
     * @param {Chats.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chats.listChatEvents("470a49f6-1dec-4afe-8b61-035d3b2d63b0", {
     *         pageNumber: 0,
     *         pageSize: 3,
     *         ascendingOrder: true
     *     })
     */
    listChatEvents(id: string, request?: Hume.empathicVoice.ChatsListChatEventsRequest, requestOptions?: Chats.RequestOptions): Promise<core.Page<Hume.empathicVoice.ReturnChatEvent, Hume.empathicVoice.ReturnChatPagedEvents>>;
    /**
     * Fetches the audio of a previous **Chat**. For more details, see our guide on audio reconstruction [here](/docs/speech-to-speech-evi/faq#can-i-access-the-audio-of-previous-conversations-with-evi).
     *
     * @param {string} id - Identifier for a chat. Formatted as a UUID.
     * @param {Chats.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.BadRequestError}
     *
     * @example
     *     await client.empathicVoice.chats.getAudio("470a49f6-1dec-4afe-8b61-035d3b2d63b0")
     */
    getAudio(id: string, requestOptions?: Chats.RequestOptions): core.HttpResponsePromise<Hume.empathicVoice.ReturnChatAudioReconstruction>;
    private __getAudio;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
