import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { DescriptionsScore } from "./DescriptionsScore.js";
import { EmotionScore } from "./EmotionScore.js";
import { TimeInterval } from "./TimeInterval.js";
export declare const BurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.BurstPrediction.Raw, Hume.expressionMeasurement.batch.BurstPrediction>;
export declare namespace BurstPrediction {
    interface Raw {
        time: TimeInterval.Raw;
        emotions: EmotionScore.Raw[];
        descriptions: DescriptionsScore.Raw[];
    }
}
