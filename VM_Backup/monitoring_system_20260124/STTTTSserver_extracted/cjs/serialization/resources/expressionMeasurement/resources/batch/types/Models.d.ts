import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Face } from "./Face.js";
import { Language } from "./Language.js";
import { Ner } from "./Ner.js";
import { Prosody } from "./Prosody.js";
import { Unconfigurable } from "./Unconfigurable.js";
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
