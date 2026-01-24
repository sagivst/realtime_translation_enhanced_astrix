import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmotionEmbeddingItem } from "./EmotionEmbeddingItem.js";
export declare const EmotionEmbedding: core.serialization.Schema<serializers.expressionMeasurement.stream.EmotionEmbedding.Raw, Hume.expressionMeasurement.stream.EmotionEmbedding>;
export declare namespace EmotionEmbedding {
    type Raw = EmotionEmbeddingItem.Raw[];
}
