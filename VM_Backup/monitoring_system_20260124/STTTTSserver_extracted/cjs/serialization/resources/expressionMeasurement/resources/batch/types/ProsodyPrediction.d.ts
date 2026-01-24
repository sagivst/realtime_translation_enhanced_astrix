import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmotionScore } from "./EmotionScore.js";
import { TimeInterval } from "./TimeInterval.js";
export declare const ProsodyPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.ProsodyPrediction.Raw, Hume.expressionMeasurement.batch.ProsodyPrediction>;
export declare namespace ProsodyPrediction {
    interface Raw {
        text?: string | null;
        time: TimeInterval.Raw;
        confidence?: number | null;
        speaker_confidence?: number | null;
        emotions: EmotionScore.Raw[];
    }
}
