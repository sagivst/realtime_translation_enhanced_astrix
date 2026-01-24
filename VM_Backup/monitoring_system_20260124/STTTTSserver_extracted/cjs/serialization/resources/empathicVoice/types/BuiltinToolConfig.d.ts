import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { BuiltInTool } from "./BuiltInTool.js";
export declare const BuiltinToolConfig: core.serialization.ObjectSchema<serializers.empathicVoice.BuiltinToolConfig.Raw, Hume.empathicVoice.BuiltinToolConfig>;
export declare namespace BuiltinToolConfig {
    interface Raw {
        fallback_content?: string | null;
        name: BuiltInTool.Raw;
    }
}
