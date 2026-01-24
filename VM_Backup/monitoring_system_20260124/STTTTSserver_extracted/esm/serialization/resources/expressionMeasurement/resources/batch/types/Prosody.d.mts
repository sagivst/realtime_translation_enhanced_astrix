import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Granularity } from "./Granularity.mjs";
import { Window } from "./Window.mjs";
export declare const Prosody: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Prosody.Raw, Hume.expressionMeasurement.batch.Prosody>;
export declare namespace Prosody {
    interface Raw {
        granularity?: Granularity.Raw | null;
        window?: Window.Raw | null;
        identify_speakers?: boolean | null;
    }
}
