import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnUserDefinedTool } from "./ReturnUserDefinedTool.mjs";
export declare const ReturnPagedUserDefinedTools: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedUserDefinedTools.Raw, Hume.empathicVoice.ReturnPagedUserDefinedTools>;
export declare namespace ReturnPagedUserDefinedTools {
    interface Raw {
        page_number: number;
        page_size: number;
        tools_page: (ReturnUserDefinedTool.Raw | null | undefined)[];
        total_pages: number;
    }
}
