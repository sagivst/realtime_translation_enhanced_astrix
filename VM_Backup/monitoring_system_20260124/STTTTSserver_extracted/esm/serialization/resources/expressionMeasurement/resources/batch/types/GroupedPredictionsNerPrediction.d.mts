import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { NerPrediction } from "./NerPrediction.mjs";
export declare const GroupedPredictionsNerPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsNerPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsNerPrediction>;
export declare namespace GroupedPredictionsNerPrediction {
    interface Raw {
        id: string;
        predictions: NerPrediction.Raw[];
    }
}
