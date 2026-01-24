import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
import { PositionInterval } from "./PositionInterval.mjs";
import { TimeInterval } from "./TimeInterval.mjs";
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
