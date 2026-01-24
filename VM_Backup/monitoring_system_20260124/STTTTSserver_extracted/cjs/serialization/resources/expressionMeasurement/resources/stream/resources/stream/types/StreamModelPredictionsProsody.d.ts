import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsProsodyPredictionsItem } from "./StreamModelPredictionsProsodyPredictionsItem.js";
export declare const StreamModelPredictionsProsody: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsProsody.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsProsody>;
export declare namespace StreamModelPredictionsProsody {
    interface Raw {
        predictions?: StreamModelPredictionsProsodyPredictionsItem.Raw[] | null;
    }
}
