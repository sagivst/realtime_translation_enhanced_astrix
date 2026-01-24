import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const ToxicityScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.ToxicityScore.Raw, Hume.expressionMeasurement.batch.ToxicityScore>;
export declare namespace ToxicityScore {
    interface Raw {
        name: string;
        score: number;
    }
}
