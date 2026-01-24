import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmotionEmbeddingItem } from "./EmotionEmbeddingItem.mjs";
export declare const EmotionEmbedding: core.serialization.Schema<serializers.expressionMeasurement.stream.EmotionEmbedding.Raw, Hume.expressionMeasurement.stream.EmotionEmbedding>;
export declare namespace EmotionEmbedding {
    type Raw = EmotionEmbeddingItem.Raw[];
}
