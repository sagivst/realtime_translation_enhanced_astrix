import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ConnectSessionSettingsAudio } from "./ConnectSessionSettingsAudio.js";
import { ConnectSessionSettingsContext } from "./ConnectSessionSettingsContext.js";
import { ConnectSessionSettingsVariablesValue } from "./ConnectSessionSettingsVariablesValue.js";
export declare const ConnectSessionSettings: core.serialization.ObjectSchema<serializers.empathicVoice.ConnectSessionSettings.Raw, Hume.empathicVoice.ConnectSessionSettings>;
export declare namespace ConnectSessionSettings {
    interface Raw {
        audio?: ConnectSessionSettingsAudio.Raw | null;
        context?: ConnectSessionSettingsContext.Raw | null;
        custom_session_id?: string | null;
        event_limit?: number | null;
        language_model_api_key?: string | null;
        system_prompt?: string | null;
        variables?: Record<string, ConnectSessionSettingsVariablesValue.Raw> | null;
        voice_id?: string | null;
    }
}
