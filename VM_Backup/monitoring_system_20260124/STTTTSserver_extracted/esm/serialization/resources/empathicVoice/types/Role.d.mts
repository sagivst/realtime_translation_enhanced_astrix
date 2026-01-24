import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const Role: core.serialization.Schema<serializers.empathicVoice.Role.Raw, Hume.empathicVoice.Role>;
export declare namespace Role {
    type Raw = "assistant" | "system" | "user" | "all" | "tool" | "context";
}
