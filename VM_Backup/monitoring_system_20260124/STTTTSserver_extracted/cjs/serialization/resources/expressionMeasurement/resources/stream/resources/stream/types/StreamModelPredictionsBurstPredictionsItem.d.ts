import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.js";
import { TimeRange } from "../../../types/TimeRange.js";
export declare const StreamModelPredictionsBurstPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsBurstPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsBurstPredictionsItem>;
export declare namespace StreamModelPredictionsBurstPredictionsItem {
    interface Raw {
        time?: TimeRange.Raw | null;
        emotions?: EmotionEmbedding.Raw | null;
    }
}
