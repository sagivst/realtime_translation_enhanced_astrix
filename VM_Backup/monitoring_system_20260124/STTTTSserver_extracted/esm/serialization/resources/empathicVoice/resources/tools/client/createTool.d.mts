import type * as Hume from "../../../../../../api/index.mjs";
import type * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ReturnUserDefinedTool } from "../../../types/ReturnUserDefinedTool.mjs";
export declare const Response: core.serialization.Schema<serializers.empathicVoice.tools.createTool.Response.Raw, Hume.empathicVoice.ReturnUserDefinedTool | undefined>;
export declare namespace Response {
    type Raw = ReturnUserDefinedTool.Raw | null | undefined;
}
