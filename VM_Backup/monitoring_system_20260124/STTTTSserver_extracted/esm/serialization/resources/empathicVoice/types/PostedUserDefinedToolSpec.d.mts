import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedUserDefinedToolSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedUserDefinedToolSpec.Raw, Hume.empathicVoice.PostedUserDefinedToolSpec>;
export declare namespace PostedUserDefinedToolSpec {
    interface Raw {
        id: string;
        version?: number | null;
    }
}
