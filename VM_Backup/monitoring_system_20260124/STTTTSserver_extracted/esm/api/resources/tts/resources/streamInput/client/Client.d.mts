import type { BaseClientOptions } from "../../../../../../BaseClient.mjs";
import type * as Hume from "../../../../../index.mjs";
import { StreamInputSocket } from "./Socket.mjs";
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
