import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedUserDefinedToolVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedUserDefinedToolVersionDescription.Raw, Hume.empathicVoice.PostedUserDefinedToolVersionDescription>;
export declare namespace PostedUserDefinedToolVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
