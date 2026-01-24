import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsFacePredictionsItem } from "./StreamModelPredictionsFacePredictionsItem.mjs";
export declare const StreamModelPredictionsFace: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFace.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFace>;
export declare namespace StreamModelPredictionsFace {
    interface Raw {
        predictions?: StreamModelPredictionsFacePredictionsItem.Raw[] | null;
    }
}
