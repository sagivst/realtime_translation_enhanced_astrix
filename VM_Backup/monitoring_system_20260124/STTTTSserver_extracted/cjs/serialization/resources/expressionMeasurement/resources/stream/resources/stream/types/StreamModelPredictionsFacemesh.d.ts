import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsFacemeshPredictionsItem } from "./StreamModelPredictionsFacemeshPredictionsItem.js";
export declare const StreamModelPredictionsFacemesh: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFacemesh.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFacemesh>;
export declare namespace StreamModelPredictionsFacemesh {
    interface Raw {
        predictions?: StreamModelPredictionsFacemeshPredictionsItem.Raw[] | null;
    }
}
