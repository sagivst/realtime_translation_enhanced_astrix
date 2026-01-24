import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.mjs";
import { TimeRange } from "../../../types/TimeRange.mjs";
export declare const StreamModelPredictionsProsodyPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsProsodyPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsProsodyPredictionsItem>;
export declare namespace StreamModelPredictionsProsodyPredictionsItem {
    interface Raw {
        time?: TimeRange.Raw | null;
        emotions?: EmotionEmbedding.Raw | null;
    }
}
