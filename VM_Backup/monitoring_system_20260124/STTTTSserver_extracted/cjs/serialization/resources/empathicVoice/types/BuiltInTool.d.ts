import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const BuiltInTool: core.serialization.Schema<serializers.empathicVoice.BuiltInTool.Raw, Hume.empathicVoice.BuiltInTool>;
export declare namespace BuiltInTool {
    type Raw = "web_search" | "hang_up";
}
