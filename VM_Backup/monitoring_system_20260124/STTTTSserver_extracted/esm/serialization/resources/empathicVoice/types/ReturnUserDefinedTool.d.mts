import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnUserDefinedToolToolType } from "./ReturnUserDefinedToolToolType.mjs";
import { ReturnUserDefinedToolVersionType } from "./ReturnUserDefinedToolVersionType.mjs";
export declare const ReturnUserDefinedTool: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnUserDefinedTool.Raw, Hume.empathicVoice.ReturnUserDefinedTool>;
export declare namespace ReturnUserDefinedTool {
    interface Raw {
        created_on: number;
        description?: string | null;
        fallback_content?: string | null;
        id: string;
        modified_on: number;
        name: string;
        parameters: string;
        tool_type: ReturnUserDefinedToolToolType.Raw;
        version: number;
        version_description?: string | null;
        version_type: ReturnUserDefinedToolVersionType.Raw;
    }
}
