import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Inference } from "./Inference.mjs";
export declare const AssistantProsody: core.serialization.ObjectSchema<serializers.empathicVoice.AssistantProsody.Raw, Hume.empathicVoice.AssistantProsody>;
export declare namespace AssistantProsody {
    interface Raw {
        custom_session_id?: string | null;
        id?: string | null;
        models: Inference.Raw;
        type: "assistant_prosody";
    }
}
