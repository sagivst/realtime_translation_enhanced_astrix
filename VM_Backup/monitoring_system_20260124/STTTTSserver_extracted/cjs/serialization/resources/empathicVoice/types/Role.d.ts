import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const Role: core.serialization.Schema<serializers.empathicVoice.Role.Raw, Hume.empathicVoice.Role>;
export declare namespace Role {
    type Raw = "assistant" | "system" | "user" | "all" | "tool" | "context";
}
