import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsBurstPredictionsItem } from "./StreamModelPredictionsBurstPredictionsItem.mjs";
export declare const StreamModelPredictionsBurst: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsBurst.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsBurst>;
export declare namespace StreamModelPredictionsBurst {
    interface Raw {
        predictions?: StreamModelPredictionsBurstPredictionsItem.Raw[] | null;
    }
}
