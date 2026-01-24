import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const EmotionEmbeddingItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.EmotionEmbeddingItem.Raw, Hume.expressionMeasurement.stream.EmotionEmbeddingItem>;
export declare namespace EmotionEmbeddingItem {
    interface Raw {
        name?: string | null;
        score?: number | null;
    }
}
