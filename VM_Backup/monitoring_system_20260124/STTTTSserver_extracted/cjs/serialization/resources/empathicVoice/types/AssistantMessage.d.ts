import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ChatMessage } from "./ChatMessage.js";
import { Inference } from "./Inference.js";
export declare const AssistantMessage: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantMessage.Raw, Hume.empathicVoice.AssistantMessage>;
export declare namespace AssistantMessage {
    interface Raw {
        custom_session_id?: string | null;
        from_text: boolean;
        id?: string | null;
        language?: string | null;
        message: ChatMessage.Raw;
        models: Inference.Raw;
        type: "assistant_message";
    }
}
