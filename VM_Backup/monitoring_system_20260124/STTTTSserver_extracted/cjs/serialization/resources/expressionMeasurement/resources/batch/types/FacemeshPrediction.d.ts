import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmotionScore } from "./EmotionScore.js";
export declare const FacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FacemeshPrediction.Raw, Hume.expressionMeasurement.batch.FacemeshPrediction>;
export declare namespace FacemeshPrediction {
    interface Raw {
        emotions: EmotionScore.Raw[];
    }
}
