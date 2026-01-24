import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsBurstPredictionsItem } from "./StreamModelPredictionsBurstPredictionsItem.js";
export declare const StreamModelPredictionsBurst: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsBurst.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsBurst>;
export declare namespace StreamModelPredictionsBurst {
    interface Raw {
        predictions?: StreamModelPredictionsBurstPredictionsItem.Raw[] | null;
    }
}
