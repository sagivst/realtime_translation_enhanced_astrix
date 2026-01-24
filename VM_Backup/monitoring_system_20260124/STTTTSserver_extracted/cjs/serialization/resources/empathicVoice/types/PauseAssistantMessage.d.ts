import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PauseAssistantMessage: core.serialization.ObjectSchema<serializers.empathicVoice.PauseAssistantMessage.Raw, Hume.empathicVoice.PauseAssistantMessage>;
export declare namespace PauseAssistantMessage {
    interface Raw {
        custom_session_id?: string | null;
        type: "pause_assistant_message";
    }
}
