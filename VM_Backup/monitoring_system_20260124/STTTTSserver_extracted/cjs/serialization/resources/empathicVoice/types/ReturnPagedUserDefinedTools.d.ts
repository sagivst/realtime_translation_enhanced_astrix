import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnUserDefinedTool } from "./ReturnUserDefinedTool.js";
export declare const ReturnPagedUserDefinedTools: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedUserDefinedTools.Raw, Hume.empathicVoice.ReturnPagedUserDefinedTools>;
export declare namespace ReturnPagedUserDefinedTools {
    interface Raw {
        page_number: number;
        page_size: number;
        tools_page: (ReturnUserDefinedTool.Raw | null | undefined)[];
        total_pages: number;
    }
}
