import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ProsodyInference } from "./ProsodyInference.mjs";
export declare const Inference: core.serialization.ObjectSchema<serializers.empathicVoice.Inference.Raw, Hume.empathicVoice.Inference>;
export declare namespace Inference {
    interface Raw {
        prosody?: ProsodyInference.Raw | null;
    }
}
