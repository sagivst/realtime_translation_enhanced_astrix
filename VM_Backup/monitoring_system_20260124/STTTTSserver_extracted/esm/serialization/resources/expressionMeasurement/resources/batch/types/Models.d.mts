import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Face } from "./Face.mjs";
import { Language } from "./Language.mjs";
import { Ner } from "./Ner.mjs";
import { Prosody } from "./Prosody.mjs";
import { Unconfigurable } from "./Unconfigurable.mjs";
export declare const Models: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Models.Raw, Hume.expressionMeasurement.batch.Models>;
export declare namespace Models {
    interface Raw {
        face?: Face.Raw | null;
        burst?: Unconfigurable.Raw | null;
        prosody?: Prosody.Raw | null;
        language?: Language.Raw | null;
        ner?: Ner.Raw | null;
        facemesh?: Unconfigurable.Raw | null;
    }
}
