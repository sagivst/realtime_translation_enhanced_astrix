import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ResumeAssistantMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ResumeAssistantMessage.Raw, Hume.empathicVoice.ResumeAssistantMessage>;
export declare namespace ResumeAssistantMessage {
    interface Raw {
        custom_session_id?: string | null;
        type: "resume_assistant_message";
    }
}
