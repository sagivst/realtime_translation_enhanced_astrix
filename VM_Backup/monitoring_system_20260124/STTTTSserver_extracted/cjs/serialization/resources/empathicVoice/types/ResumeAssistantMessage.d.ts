import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ResumeAssistantMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ResumeAssistantMessage.Raw, Hume.empathicVoice.ResumeAssistantMessage>;
export declare namespace ResumeAssistantMessage {
    interface Raw {
        custom_session_id?: string | null;
        type: "resume_assistant_message";
    }
}
