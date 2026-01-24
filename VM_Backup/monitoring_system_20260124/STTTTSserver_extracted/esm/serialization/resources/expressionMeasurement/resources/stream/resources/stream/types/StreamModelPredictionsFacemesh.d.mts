import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsFacemeshPredictionsItem } from "./StreamModelPredictionsFacemeshPredictionsItem.mjs";
export declare const StreamModelPredictionsFacemesh: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsFacemesh.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsFacemesh>;
export declare namespace StreamModelPredictionsFacemesh {
    interface Raw {
        predictions?: StreamModelPredictionsFacemeshPredictionsItem.Raw[] | null;
    }
}
