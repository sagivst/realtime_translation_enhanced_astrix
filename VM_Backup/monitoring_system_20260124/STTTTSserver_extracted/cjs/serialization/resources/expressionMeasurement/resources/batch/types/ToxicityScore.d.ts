import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const ToxicityScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.ToxicityScore.Raw, Hume.expressionMeasurement.batch.ToxicityScore>;
export declare namespace ToxicityScore {
    interface Raw {
        name: string;
        score: number;
    }
}
