import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsProsodyPredictionsItem } from "./StreamModelPredictionsProsodyPredictionsItem.mjs";
export declare const StreamModelPredictionsProsody: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsProsody.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsProsody>;
export declare namespace StreamModelPredictionsProsody {
    interface Raw {
        predictions?: StreamModelPredictionsProsodyPredictionsItem.Raw[] | null;
    }
}
