import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const SentimentScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.SentimentScore.Raw, Hume.expressionMeasurement.batch.SentimentScore>;
export declare namespace SentimentScore {
    interface Raw {
        name: string;
        score: number;
    }
}
