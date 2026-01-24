import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const BuiltInTool: core.serialization.Schema<serializers.empathicVoice.BuiltInTool.Raw, Hume.empathicVoice.BuiltInTool>;
export declare namespace BuiltInTool {
    type Raw = "web_search" | "hang_up";
}
