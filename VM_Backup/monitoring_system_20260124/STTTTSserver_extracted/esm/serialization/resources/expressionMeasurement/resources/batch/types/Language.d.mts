import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Granularity } from "./Granularity.mjs";
import { Unconfigurable } from "./Unconfigurable.mjs";
export declare const Language: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Language.Raw, Hume.expressionMeasurement.batch.Language>;
export declare namespace Language {
    interface Raw {
        granularity?: Granularity.Raw | null;
        sentiment?: Unconfigurable.Raw | null;
        toxicity?: Unconfigurable.Raw | null;
        identify_speakers?: boolean | null;
    }
}
