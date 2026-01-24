import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedConfigVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedConfigVersionDescription.Raw, Hume.empathicVoice.PostedConfigVersionDescription>;
export declare namespace PostedConfigVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
