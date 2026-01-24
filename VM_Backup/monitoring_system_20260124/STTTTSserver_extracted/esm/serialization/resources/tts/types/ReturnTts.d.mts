import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnGeneration } from "./ReturnGeneration.mjs";
export declare const ReturnTts: core.serialization.ObjectSchema<serializers.tts.ReturnTts.Raw, Hume.tts.ReturnTts>;
export declare namespace ReturnTts {
    interface Raw {
        generations: ReturnGeneration.Raw[];
        request_id?: string | null;
    }
}
