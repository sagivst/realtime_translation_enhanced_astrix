import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { BuiltInTool } from "./BuiltInTool.mjs";
export declare const BuiltinToolConfig: core.serialization.ObjectSchema<serializers.empathicVoice.BuiltinToolConfig.Raw, Hume.empathicVoice.BuiltinToolConfig>;
export declare namespace BuiltinToolConfig {
    interface Raw {
        fallback_content?: string | null;
        name: BuiltInTool.Raw;
    }
}
