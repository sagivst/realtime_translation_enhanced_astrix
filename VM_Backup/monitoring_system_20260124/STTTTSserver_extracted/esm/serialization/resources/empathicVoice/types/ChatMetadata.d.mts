import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ChatMetadata: core.serialization.ObjectSchema<serializers.empathicVoice.ChatMetadata.Raw, Hume.empathicVoice.ChatMetadata>;
export declare namespace ChatMetadata {
    interface Raw {
        chat_group_id: string;
        chat_id: string;
        custom_session_id?: string | null;
        request_id?: string | null;
        type: "chat_metadata";
    }
}
