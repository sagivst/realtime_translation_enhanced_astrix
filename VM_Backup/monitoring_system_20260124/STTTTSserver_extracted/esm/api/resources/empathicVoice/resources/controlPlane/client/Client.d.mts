import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient.mjs";
import * as core from "../../../../../../core/index.mjs";
import * as Hume from "../../../../../index.mjs";
import { ControlPlaneSocket } from "./Socket.mjs";
export declare namespace ControlPlane {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
    interface ConnectArgs {
        chat_id: string;
        accessToken?: string | undefined;
        /** Arbitrary headers to send with the websocket connect request. */
        headers?: Record<string, string>;
        /** Enable debug mode on the websocket. Defaults to false. */
        debug?: boolean;
        /** Number of reconnect attempts. Defaults to 30. */
        reconnectAttempts?: number;
    }
}
export declare class ControlPlane {
    protected readonly _options: ControlPlane.Options;
    constructor(_options?: ControlPlane.Options);
    /**
     * Send a message to a specific chat.
     *
     * @param {string} chatId
     * @param {Hume.empathicVoice.ControlPlanePublishEvent} request
     * @param {ControlPlane.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.empathicVoice.UnprocessableEntityError}
     *
     * @example
     *     await client.empathicVoice.controlPlane.send("chat_id", {
     *         type: "session_settings"
     *     })
     */
    send(chatId: string, request: Hume.empathicVoice.ControlPlanePublishEvent, requestOptions?: ControlPlane.RequestOptions): core.HttpResponsePromise<void>;
    private __send;
    connect(args: ControlPlane.ConnectArgs): Promise<ControlPlaneSocket>;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | null | undefined>>;
}
