import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const EmotionScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmotionScore.Raw, Hume.expressionMeasurement.batch.EmotionScore>;
export declare namespace EmotionScore {
    interface Raw {
        name: string;
        score: number;
    }
}
