import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { EmotionScores } from "./EmotionScores.mjs";
export declare const ProsodyInference: core.serialization.ObjectSchema<serializers.empathicVoice.ProsodyInference.Raw, Hume.empathicVoice.ProsodyInference>;
export declare namespace ProsodyInference {
    interface Raw {
        scores: EmotionScores.Raw;
    }
}
