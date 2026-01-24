import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ContextType } from "./ContextType.mjs";
export declare const ConnectSessionSettingsContext: core.serialization.ObjectSchema<serializers.empathicVoice.ConnectSessionSettingsContext.Raw, Hume.empathicVoice.ConnectSessionSettingsContext>;
export declare namespace ConnectSessionSettingsContext {
    interface Raw {
        text?: string | null;
        type?: ContextType.Raw | null;
    }
}
