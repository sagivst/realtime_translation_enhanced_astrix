import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedBuiltinToolName: core.serialization.Schema<serializers.empathicVoice.PostedBuiltinToolName.Raw, Hume.empathicVoice.PostedBuiltinToolName>;
export declare namespace PostedBuiltinToolName {
    type Raw = "web_search" | "hang_up";
}
