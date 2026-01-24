import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
import { TimeInterval } from "./TimeInterval.mjs";
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
