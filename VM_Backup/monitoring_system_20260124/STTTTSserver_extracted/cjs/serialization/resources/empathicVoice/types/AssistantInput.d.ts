import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const AssistantInput: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantInput.Raw, Hume.empathicVoice.AssistantInput>;
export declare namespace AssistantInput {
    interface Raw {
        custom_session_id?: string | null;
        text: string;
        type: "assistant_input";
    }
}
