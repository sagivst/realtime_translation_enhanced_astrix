import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ContextType: core.serialization.Schema<serializers.empathicVoice.ContextType.Raw, Hume.empathicVoice.ContextType>;
export declare namespace ContextType {
    type Raw = "persistent" | "temporary";
}
