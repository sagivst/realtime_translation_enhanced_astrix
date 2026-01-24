import type { BaseClientOptions } from "../../../../../../BaseClient.js";
import type * as Hume from "../../../../../index.js";
import { StreamInputSocket } from "./Socket.js";
export declare namespace StreamInput {
    interface Options extends BaseClientOptions {
    }
    interface ConnectArgs {
        accessToken?: string | undefined;
        contextGenerationId?: string | undefined;
        formatType?: Hume.tts.AudioFormatType | undefined;
        includeTimestampTypes?: Hume.tts.TimestampType | undefined;
        instantMode?: boolean | undefined;
        noBinary?: boolean | undefined;
        stripHeaders?: boolean | undefined;
        version?: Hume.tts.OctaveVersion | undefined;
        apiKey?: string | undefined;
        /** Arbitrary headers to send with the websocket connect request. */
        headers?: Record<string, string>;
        /** Enable debug mode on the websocket. Defaults to false. */
        debug?: boolean;
        /** Number of reconnect attempts. Defaults to 30. */
        reconnectAttempts?: number;
    }
}
export declare class StreamInput {
    protected readonly _options: StreamInput.Options;
    constructor(_options?: StreamInput.Options);
    connect(args?: StreamInput.ConnectArgs): Promise<StreamInputSocket>;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | null | undefined>>;
}
