import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
export declare const FacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FacemeshPrediction.Raw, Hume.expressionMeasurement.batch.FacemeshPrediction>;
export declare namespace FacemeshPrediction {
    interface Raw {
        emotions: EmotionScore.Raw[];
    }
}
