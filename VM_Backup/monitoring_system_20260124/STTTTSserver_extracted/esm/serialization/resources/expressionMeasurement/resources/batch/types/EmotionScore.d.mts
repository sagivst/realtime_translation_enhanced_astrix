import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const EmotionScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmotionScore.Raw, Hume.expressionMeasurement.batch.EmotionScore>;
export declare namespace EmotionScore {
    interface Raw {
        name: string;
        score: number;
    }
}
