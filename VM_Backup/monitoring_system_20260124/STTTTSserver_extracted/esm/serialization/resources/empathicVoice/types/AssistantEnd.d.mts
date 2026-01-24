import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const AssistantEnd: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantEnd.Raw, Hume.empathicVoice.AssistantEnd>;
export declare namespace AssistantEnd {
    interface Raw {
        custom_session_id?: string | null;
        type: "assistant_end";
    }
}
