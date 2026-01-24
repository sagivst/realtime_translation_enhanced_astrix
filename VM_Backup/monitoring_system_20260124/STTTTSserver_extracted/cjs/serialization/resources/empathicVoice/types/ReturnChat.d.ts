import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatStatus } from "./ReturnChatStatus.js";
import { ReturnConfigSpec } from "./ReturnConfigSpec.js";
export declare const ReturnChat: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChat.Raw, Hume.empathicVoice.ReturnChat>;
export declare namespace ReturnChat {
    interface Raw {
        chat_group_id: string;
        config?: ReturnConfigSpec.Raw | null;
        end_timestamp?: number | null;
        event_count?: number | null;
        id: string;
        metadata?: string | null;
        start_timestamp: number;
        status: ReturnChatStatus.Raw;
    }
}
