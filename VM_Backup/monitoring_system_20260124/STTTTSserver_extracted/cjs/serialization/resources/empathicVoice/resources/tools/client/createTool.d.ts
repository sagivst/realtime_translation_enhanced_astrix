import type * as Hume from "../../../../../../api/index.js";
import type * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ReturnUserDefinedTool } from "../../../types/ReturnUserDefinedTool.js";
export declare const Response: core.serialization.Schema<serializers.empathicVoice.tools.createTool.Response.Raw, Hume.empathicVoice.ReturnUserDefinedTool | undefined>;
export declare namespace Response {
    type Raw = ReturnUserDefinedTool.Raw | null | undefined;
}
