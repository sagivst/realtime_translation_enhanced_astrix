import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnPrompt: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPrompt.Raw, Hume.empathicVoice.ReturnPrompt>;
export declare namespace ReturnPrompt {
    interface Raw {
        created_on: number;
        id: string;
        modified_on: number;
        name: string;
        text: string;
        version: number;
        version_description?: string | null;
        version_type: string;
    }
}
