import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const EmotionEmbeddingItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.EmotionEmbeddingItem.Raw, Hume.expressionMeasurement.stream.EmotionEmbeddingItem>;
export declare namespace EmotionEmbeddingItem {
    interface Raw {
        name?: string | null;
        score?: number | null;
    }
}
