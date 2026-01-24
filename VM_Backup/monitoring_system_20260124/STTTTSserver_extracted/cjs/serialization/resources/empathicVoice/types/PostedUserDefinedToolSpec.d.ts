import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedUserDefinedToolSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedUserDefinedToolSpec.Raw, Hume.empathicVoice.PostedUserDefinedToolSpec>;
export declare namespace PostedUserDefinedToolSpec {
    interface Raw {
        id: string;
        version?: number | null;
    }
}
