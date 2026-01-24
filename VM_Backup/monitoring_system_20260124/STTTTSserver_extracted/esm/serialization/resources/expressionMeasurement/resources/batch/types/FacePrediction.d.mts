import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { BoundingBox } from "./BoundingBox.mjs";
import { DescriptionsScore } from "./DescriptionsScore.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
import { FacsScore } from "./FacsScore.mjs";
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
