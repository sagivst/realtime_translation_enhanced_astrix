import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ToolType } from "./ToolType.mjs";
export declare const Tool: core.serialization.ObjectSchema<serializers.empathicVoice.Tool.Raw, Hume.empathicVoice.Tool>;
export declare namespace Tool {
    interface Raw {
        description?: string | null;
        fallback_content?: string | null;
        name: string;
        parameters: string;
        type: ToolType.Raw;
    }
}
