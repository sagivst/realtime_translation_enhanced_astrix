import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { Inference } from "./Inference.js";
export declare const AssistantProsody: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantProsody.Raw, Hume.empathicVoice.AssistantProsody>;
export declare namespace AssistantProsody {
    interface Raw {
        custom_session_id?: string | null;
        id?: string | null;
        models: Inference.Raw;
        type: "assistant_prosody";
    }
}
