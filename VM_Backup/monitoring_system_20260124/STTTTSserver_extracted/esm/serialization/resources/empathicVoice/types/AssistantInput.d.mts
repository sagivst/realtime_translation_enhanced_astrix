import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const AssistantInput: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantInput.Raw, Hume.empathicVoice.AssistantInput>;
export declare namespace AssistantInput {
    interface Raw {
        custom_session_id?: string | null;
        text: string;
        type: "assistant_input";
    }
}
