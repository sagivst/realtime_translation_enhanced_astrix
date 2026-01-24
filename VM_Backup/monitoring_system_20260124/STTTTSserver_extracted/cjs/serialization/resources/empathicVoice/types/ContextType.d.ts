import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ContextType: core.serialization.Schema<serializers.empathicVoice.ContextType.Raw, Hume.empathicVoice.ContextType>;
export declare namespace ContextType {
    type Raw = "persistent" | "temporary";
}
