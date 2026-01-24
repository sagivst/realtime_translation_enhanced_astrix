import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamFace } from "./StreamFace.js";
import { StreamLanguage } from "./StreamLanguage.js";
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
