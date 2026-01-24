import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Ner: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Ner.Raw, Hume.expressionMeasurement.batch.Ner>;
export declare namespace Ner {
    interface Raw {
        identify_speakers?: boolean | null;
    }
}
