import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsLanguagePredictionsItem } from "./StreamModelPredictionsLanguagePredictionsItem.js";
export declare const StreamModelPredictionsLanguage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsLanguage.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsLanguage>;
export declare namespace StreamModelPredictionsLanguage {
    interface Raw {
        predictions?: StreamModelPredictionsLanguagePredictionsItem.Raw[] | null;
    }
}
