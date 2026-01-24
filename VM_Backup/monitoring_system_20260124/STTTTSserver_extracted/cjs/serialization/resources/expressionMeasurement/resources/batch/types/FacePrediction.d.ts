import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { BoundingBox } from "./BoundingBox.js";
import { DescriptionsScore } from "./DescriptionsScore.js";
import { EmotionScore } from "./EmotionScore.js";
import { FacsScore } from "./FacsScore.js";
export declare const FacePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FacePrediction.Raw, Hume.expressionMeasurement.batch.FacePrediction>;
export declare namespace FacePrediction {
    interface Raw {
        frame: number;
        time: number;
        prob: number;
        box: BoundingBox.Raw;
        emotions: EmotionScore.Raw[];
        facs?: FacsScore.Raw[] | null;
        descriptions?: DescriptionsScore.Raw[] | null;
    }
}
