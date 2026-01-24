import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedUserDefinedToolVersion: core.serialization.Schema<serializers.empathicVoice.PostedUserDefinedToolVersion.Raw, Hume.empathicVoice.PostedUserDefinedToolVersion>;
export declare namespace PostedUserDefinedToolVersion {
    interface Raw {
        description?: string | null;
        fallback_content?: string | null;
        parameters: string;
        version_description?: string | null;
    }
}
