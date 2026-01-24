import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnConfigSpec } from "./ReturnConfigSpec.js";
export declare const ReturnChatGroup: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatGroup.Raw, Hume.empathicVoice.ReturnChatGroup>;
export declare namespace ReturnChatGroup {
    interface Raw {
        active?: boolean | null;
        first_start_timestamp: number;
        id: string;
        most_recent_chat_id?: string | null;
        most_recent_config?: ReturnConfigSpec.Raw | null;
        most_recent_start_timestamp: number;
        num_chats: number;
    }
}
