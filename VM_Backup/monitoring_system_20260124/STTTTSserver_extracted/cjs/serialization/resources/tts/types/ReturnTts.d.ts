import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnGeneration } from "./ReturnGeneration.js";
export declare const ReturnTts: core.serialization.ObjectSchema<serializers.tts.ReturnTts.Raw, Hume.tts.ReturnTts>;
export declare namespace ReturnTts {
    interface Raw {
        generations: ReturnGeneration.Raw[];
        request_id?: string | null;
    }
}
