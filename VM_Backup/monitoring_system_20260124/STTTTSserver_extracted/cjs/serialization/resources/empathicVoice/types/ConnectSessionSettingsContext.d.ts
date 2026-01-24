import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ContextType } from "./ContextType.js";
export declare const ConnectSessionSettingsContext: core.serialization.ObjectSchema<serializers.empathicVoice.ConnectSessionSettingsContext.Raw, Hume.empathicVoice.ConnectSessionSettingsContext>;
export declare namespace ConnectSessionSettingsContext {
    interface Raw {
        text?: string | null;
        type?: ContextType.Raw | null;
    }
}
