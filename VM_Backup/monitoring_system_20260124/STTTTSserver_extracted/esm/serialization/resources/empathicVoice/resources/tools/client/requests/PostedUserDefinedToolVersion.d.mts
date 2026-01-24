import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedUserDefinedToolVersion: core.serialization.Schema<serializers.empathicVoice.PostedUserDefinedToolVersion.Raw, Hume.empathicVoice.PostedUserDefinedToolVersion>;
export declare namespace PostedUserDefinedToolVersion {
    interface Raw {
        description?: string | null;
        fallback_content?: string | null;
        parameters: string;
        version_description?: string | null;
    }
}
