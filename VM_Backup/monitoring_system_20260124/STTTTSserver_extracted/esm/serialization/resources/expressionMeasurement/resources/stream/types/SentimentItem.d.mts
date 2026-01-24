import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const SentimentItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.SentimentItem.Raw, Hume.expressionMeasurement.stream.SentimentItem>;
export declare namespace SentimentItem {
    interface Raw {
        name?: string | null;
        score?: number | null;
    }
}
