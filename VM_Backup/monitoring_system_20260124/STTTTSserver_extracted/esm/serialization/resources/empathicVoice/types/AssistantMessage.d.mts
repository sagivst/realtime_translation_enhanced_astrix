import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ChatMessage } from "./ChatMessage.mjs";
import { Inference } from "./Inference.mjs";
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
