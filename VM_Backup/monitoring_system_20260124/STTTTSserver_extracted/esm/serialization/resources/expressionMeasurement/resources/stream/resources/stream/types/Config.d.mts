import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamFace } from "./StreamFace.mjs";
import { StreamLanguage } from "./StreamLanguage.mjs";
export declare const Config: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.Config.Raw, Hume.expressionMeasurement.stream.Config>;
export declare namespace Config {
    interface Raw {
        burst?: Record<string, unknown> | null;
        face?: StreamFace.Raw | null;
        facemesh?: Record<string, unknown> | null;
        language?: StreamLanguage.Raw | null;
        prosody?: Record<string, unknown> | null;
    }
}
