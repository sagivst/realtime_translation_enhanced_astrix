import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { DescriptionsScore } from "./DescriptionsScore.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
import { TimeInterval } from "./TimeInterval.mjs";
export declare const BurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.BurstPrediction.Raw, Hume.expressionMeasurement.batch.BurstPrediction>;
export declare namespace BurstPrediction {
    interface Raw {
        time: TimeInterval.Raw;
        emotions: EmotionScore.Raw[];
        descriptions: DescriptionsScore.Raw[];
    }
}
