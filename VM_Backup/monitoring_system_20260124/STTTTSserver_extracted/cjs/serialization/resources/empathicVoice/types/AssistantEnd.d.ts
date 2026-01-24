import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const AssistantEnd: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantEnd.Raw, Hume.empathicVoice.AssistantEnd>;
export declare namespace AssistantEnd {
    interface Raw {
        custom_session_id?: string | null;
        type: "assistant_end";
    }
}
