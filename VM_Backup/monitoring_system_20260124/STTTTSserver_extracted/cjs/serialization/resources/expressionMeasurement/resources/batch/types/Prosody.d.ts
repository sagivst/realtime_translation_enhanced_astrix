import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Granularity } from "./Granularity.js";
import { Window } from "./Window.js";
export declare const Prosody: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Prosody.Raw, Hume.expressionMeasurement.batch.Prosody>;
export declare namespace Prosody {
    interface Raw {
        granularity?: Granularity.Raw | null;
        window?: Window.Raw | null;
        identify_speakers?: boolean | null;
    }
}
