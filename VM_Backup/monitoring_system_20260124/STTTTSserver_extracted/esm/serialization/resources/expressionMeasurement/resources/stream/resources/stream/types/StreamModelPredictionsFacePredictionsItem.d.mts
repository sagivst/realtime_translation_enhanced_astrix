import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.mjs";
import { StreamBoundingBox } from "../../../types/StreamBoundingBox.mjs";
export declare const StreamModelPredictionsFacePredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFacePredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFacePredictionsItem>;
export declare namespace StreamModelPredictionsFacePredictionsItem {
    interface Raw {
        frame?: number | null;
        time?: number | null;
        bbox?: StreamBoundingBox.Raw | null;
        prob?: number | null;
        face_id?: string | null;
        emotions?: EmotionEmbedding.Raw | null;
        facs?: EmotionEmbedding.Raw | null;
        descriptions?: EmotionEmbedding.Raw | null;
    }
}
