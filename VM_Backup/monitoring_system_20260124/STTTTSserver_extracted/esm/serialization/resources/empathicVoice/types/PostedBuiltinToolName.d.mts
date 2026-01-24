import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedBuiltinToolName: core.serialization.Schema<serializers.empathicVoice.PostedBuiltinToolName.Raw, Hume.empathicVoice.PostedBuiltinToolName>;
export declare namespace PostedBuiltinToolName {
    type Raw = "web_search" | "hang_up";
}
