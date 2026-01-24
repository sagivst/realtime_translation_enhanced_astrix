import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedUserDefinedToolVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedUserDefinedToolVersionDescription.Raw, Hume.empathicVoice.PostedUserDefinedToolVersionDescription>;
export declare namespace PostedUserDefinedToolVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
