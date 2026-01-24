import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Granularity } from "./Granularity.js";
import { Unconfigurable } from "./Unconfigurable.js";
export declare const Language: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Language.Raw, Hume.expressionMeasurement.batch.Language>;
export declare namespace Language {
    interface Raw {
        granularity?: Granularity.Raw | null;
        sentiment?: Unconfigurable.Raw | null;
        toxicity?: Unconfigurable.Raw | null;
        identify_speakers?: boolean | null;
    }
}
