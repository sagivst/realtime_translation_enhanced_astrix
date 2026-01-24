import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnChatEventType: core.serialization.Schema<serializers.empathicVoice.ReturnChatEventType.Raw, Hume.empathicVoice.ReturnChatEventType>;
export declare namespace ReturnChatEventType {
    type Raw = "FUNCTION_CALL" | "FUNCTION_CALL_RESPONSE" | "CHAT_END_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_PROMPT" | "USER_RECORDING_START_MESSAGE" | "RESUME_ONSET" | "USER_INTERRUPTION" | "CHAT_START_MESSAGE" | "PAUSE_ONSET" | "USER_MESSAGE";
}
