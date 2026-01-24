import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { NerPrediction } from "./NerPrediction.js";
export declare const GroupedPredictionsNerPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsNerPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsNerPrediction>;
export declare namespace GroupedPredictionsNerPrediction {
    interface Raw {
        id: string;
        predictions: NerPrediction.Raw[];
    }
}
