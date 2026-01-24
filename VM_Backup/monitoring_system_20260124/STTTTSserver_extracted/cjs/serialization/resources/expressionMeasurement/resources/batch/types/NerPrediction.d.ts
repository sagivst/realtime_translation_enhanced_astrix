import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmotionScore } from "./EmotionScore.js";
import { PositionInterval } from "./PositionInterval.js";
import { TimeInterval } from "./TimeInterval.js";
export declare const NerPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.NerPrediction.Raw, Hume.expressionMeasurement.batch.NerPrediction>;
export declare namespace NerPrediction {
    interface Raw {
        entity: string;
        position: PositionInterval.Raw;
        entity_confidence: number;
        support: number;
        uri: string;
        link_word: string;
        time?: TimeInterval.Raw | null;
        confidence?: number | null;
        speaker_confidence?: number | null;
        emotions: EmotionScore.Raw[];
    }
}
