import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsFacePredictionsItem } from "./StreamModelPredictionsFacePredictionsItem.js";
export declare const StreamModelPredictionsFace: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFace.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFace>;
export declare namespace StreamModelPredictionsFace {
    interface Raw {
        predictions?: StreamModelPredictionsFacePredictionsItem.Raw[] | null;
    }
}
