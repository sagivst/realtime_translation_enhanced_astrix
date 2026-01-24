import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ConnectSessionSettingsAudio } from "./ConnectSessionSettingsAudio.mjs";
import { ConnectSessionSettingsContext } from "./ConnectSessionSettingsContext.mjs";
import { ConnectSessionSettingsVariablesValue } from "./ConnectSessionSettingsVariablesValue.mjs";
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
