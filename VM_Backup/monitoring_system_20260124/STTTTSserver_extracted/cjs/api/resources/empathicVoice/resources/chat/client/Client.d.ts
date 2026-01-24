/** THIS FILE IS MANUALLY MAINTAINED: see .fernignore */
import * as environments from "../../../../../../environments.js";
import * as core from "../../../../../../core/index.js";
import * as Hume from "../../../../../index.js";
import { ChatSocket } from "./Socket.js";
export declare namespace Chat {
    interface Options {
        environment?: core.Supplier<environments.HumeEnvironment | environments.HumeEnvironmentUrls>;
        /** Specify a custom URL to connect the client to. */
        baseUrl?: core.Supplier<string>;
        apiKey?: core.Supplier<string | undefined>;
        /** Additional headers to include in requests. */
        headers?: Record<string, string | core.Supplier<string | null | undefined> | null | undefined>;
    }
    interface ConnectArgs {
        accessToken?: string | undefined;
        configId?: string | undefined;
        configVersion?: string | number | undefined;
        eventLimit?: number | undefined;
        resumedChatGroupId?: string | undefined;
        verboseTranscription?: boolean | undefined;
        allowConnection?: boolean | undefined;
        /** @deprecated Use sessionSettings.voiceId instead */
        voiceId?: string | undefined;
        apiKey?: string | undefined;
        sessionSettings?: Hume.empathicVoice.ConnectSessionSettings;
        /** Extra query parameters sent at WebSocket connection */
        queryParams?: Record<string, string | string[] | object | object[]>;
        /** Arbitrary headers to send with the websocket connect request. */
        headers?: Record<string, string>;
        /** Enable debug mode on the websocket. Defaults to false. */
        debug?: boolean;
        /** Number of reconnect attempts. Defaults to 30. */
        reconnectAttempts?: number;
    }
}
export declare class Chat {
    protected readonly _options: Chat.Options;
    constructor(_options?: Chat.Options);
    connect(args?: Chat.ConnectArgs): ChatSocket;
    protected _getCustomAuthorizationHeaders(): Record<string, string | null | undefined>;
}
