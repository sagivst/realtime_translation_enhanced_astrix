import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsLanguagePredictionsItem } from "./StreamModelPredictionsLanguagePredictionsItem.mjs";
export declare const StreamModelPredictionsLanguage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsLanguage.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsLanguage>;
export declare namespace StreamModelPredictionsLanguage {
    interface Raw {
        predictions?: StreamModelPredictionsLanguagePredictionsItem.Raw[] | null;
    }
}
