import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Ner: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Ner.Raw, Hume.expressionMeasurement.batch.Ner>;
export declare namespace Ner {
    interface Raw {
        identify_speakers?: boolean | null;
    }
}
