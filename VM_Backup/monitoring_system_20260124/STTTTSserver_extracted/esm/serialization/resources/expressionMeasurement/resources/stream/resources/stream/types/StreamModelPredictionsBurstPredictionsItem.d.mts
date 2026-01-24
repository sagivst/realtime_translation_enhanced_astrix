import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.mjs";
import { TimeRange } from "../../../types/TimeRange.mjs";
export declare const StreamModelPredictionsBurstPredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsBurstPredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsBurstPredictionsItem>;
export declare namespace StreamModelPredictionsBurstPredictionsItem {
    interface Raw {
        time?: TimeRange.Raw | null;
        emotions?: EmotionEmbedding.Raw | null;
    }
}
