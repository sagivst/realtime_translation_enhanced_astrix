import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
export declare const StreamLanguage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamLanguage.Raw, Hume.expressionMeasurement.stream.StreamLanguage>;
export declare namespace StreamLanguage {
    interface Raw {
        sentiment?: Record<string, unknown> | null;
        toxicity?: Record<string, unknown> | null;
        granularity?: string | null;
    }
}
