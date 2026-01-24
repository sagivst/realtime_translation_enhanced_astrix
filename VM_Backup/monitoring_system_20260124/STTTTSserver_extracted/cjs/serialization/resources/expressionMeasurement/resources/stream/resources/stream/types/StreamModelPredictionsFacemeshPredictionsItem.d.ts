import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.js";
export declare const StreamModelPredictionsFacemeshPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFacemeshPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFacemeshPredictionsItem>;
export declare namespace StreamModelPredictionsFacemeshPredictionsItem {
    interface Raw {
        emotions?: EmotionEmbedding.Raw | null;
    }
}
