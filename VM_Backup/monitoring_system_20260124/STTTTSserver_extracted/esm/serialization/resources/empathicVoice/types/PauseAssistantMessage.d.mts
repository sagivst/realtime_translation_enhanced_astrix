import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PauseAssistantMessage: core.serialization.ObjectSchema<serializers.empathicVoice.PauseAssistantMessage.Raw, Hume.empathicVoice.PauseAssistantMessage>;
export declare namespace PauseAssistantMessage {
    interface Raw {
        custom_session_id?: string | null;
        type: "pause_assistant_message";
    }
}
