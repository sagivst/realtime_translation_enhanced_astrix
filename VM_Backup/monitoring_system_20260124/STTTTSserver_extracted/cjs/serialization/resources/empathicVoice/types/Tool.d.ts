import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ToolType } from "./ToolType.js";
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
