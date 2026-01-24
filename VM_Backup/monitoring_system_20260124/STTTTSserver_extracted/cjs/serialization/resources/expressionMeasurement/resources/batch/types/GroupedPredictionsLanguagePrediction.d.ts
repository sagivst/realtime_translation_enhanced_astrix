import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { LanguagePrediction } from "./LanguagePrediction.js";
export declare const GroupedPredictionsLanguagePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsLanguagePrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsLanguagePrediction>;
export declare namespace GroupedPredictionsLanguagePrediction {
    interface Raw {
        id: string;
        predictions: LanguagePrediction.Raw[];
    }
}
