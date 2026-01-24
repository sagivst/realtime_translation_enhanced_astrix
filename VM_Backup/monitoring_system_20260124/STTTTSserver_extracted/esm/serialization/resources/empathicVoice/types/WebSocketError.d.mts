import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
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
