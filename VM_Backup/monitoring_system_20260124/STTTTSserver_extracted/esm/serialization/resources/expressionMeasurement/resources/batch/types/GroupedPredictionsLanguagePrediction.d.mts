import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { LanguagePrediction } from "./LanguagePrediction.mjs";
export declare const GroupedPredictionsLanguagePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsLanguagePrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsLanguagePrediction>;
export declare namespace GroupedPredictionsLanguagePrediction {
    interface Raw {
        id: string;
        predictions: LanguagePrediction.Raw[];
    }
}
