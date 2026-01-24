import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ProsodyInference } from "./ProsodyInference.js";
export declare const Inference: core.serialization.ObjectSchema<serializers.empathicVoice.Inference.Raw, Hume.empathicVoice.Inference>;
export declare namespace Inference {
    interface Raw {
        prosody?: ProsodyInference.Raw | null;
    }
}
