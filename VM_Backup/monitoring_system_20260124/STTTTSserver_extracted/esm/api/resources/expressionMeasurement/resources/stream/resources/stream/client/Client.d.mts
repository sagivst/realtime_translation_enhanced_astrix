import type { BaseClientOptions } from "../../../../../../../../BaseClient.mjs";
import { StreamSocket } from "./Socket.mjs";
export declare namespace Stream {
    interface Options extends BaseClientOptions {
    }
    interface ConnectArgs {
        "X-Hume-Api-Key": string;
        /** Arbitrary headers to send with the websocket connect request. */
        headers?: Record<string, string>;
        /** Enable debug mode on the websocket. Defaults to false. */
        debug?: boolean;
        /** Number of reconnect attempts. Defaults to 30. */
        reconnectAttempts?: number;
    }
}
export declare class Stream {
    protected readonly _options: Stream.Options;
    constructor(_options?: Stream.Options);
    connect(args: Stream.ConnectArgs): Promise<StreamSocket>;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
