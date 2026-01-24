import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { EmotionScores } from "./EmotionScores.js";
export declare const ProsodyInference: core.serialization.ObjectSchema<serializers.empathicVoice.ProsodyInference.Raw, Hume.empathicVoice.ProsodyInference>;
export declare namespace ProsodyInference {
    interface Raw {
        scores: EmotionScores.Raw;
    }
}
