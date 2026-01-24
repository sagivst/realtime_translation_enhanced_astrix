import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedConfigVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedConfigVersionDescription.Raw, Hume.empathicVoice.PostedConfigVersionDescription>;
export declare namespace PostedConfigVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
