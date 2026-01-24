import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.js";
import { TimeRange } from "../../../types/TimeRange.js";
export declare const StreamModelPredictionsProsodyPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsProsodyPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsProsodyPredictionsItem>;
export declare namespace StreamModelPredictionsProsodyPredictionsItem {
    interface Raw {
        time?: TimeRange.Raw | null;
        emotions?: EmotionEmbedding.Raw | null;
    }
}
