import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
export declare const StreamLanguage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamLanguage.Raw, Hume.expressionMeasurement.stream.StreamLanguage>;
export declare namespace StreamLanguage {
    interface Raw {
        sentiment?: Record<string, unknown> | null;
        toxicity?: Record<string, unknown> | null;
        granularity?: string | null;
    }
}
