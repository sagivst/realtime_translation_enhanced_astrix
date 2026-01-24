import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const WebSocketError: core.serialization.ObjectSchema<serializers.empathicVoice.WebSocketError.Raw, Hume.empathicVoice.WebSocketError>;
export declare namespace WebSocketError {
    interface Raw {
        code: string;
        custom_session_id?: string | null;
        message: string;
        request_id?: string | null;
        slug: string;
        type: "error";
    }
}
