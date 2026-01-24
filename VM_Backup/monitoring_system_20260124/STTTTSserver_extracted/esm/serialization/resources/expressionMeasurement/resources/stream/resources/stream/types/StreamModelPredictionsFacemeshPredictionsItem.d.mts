import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.mjs";
export declare const StreamModelPredictionsFacemeshPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFacemeshPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFacemeshPredictionsItem>;
export declare namespace StreamModelPredictionsFacemeshPredictionsItem {
    interface Raw {
        emotions?: EmotionEmbedding.Raw | null;
    }
}
