import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnConfigSpec } from "./ReturnConfigSpec.mjs";
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
