import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { AudioConfiguration } from "./AudioConfiguration.js";
import { BuiltinToolConfig } from "./BuiltinToolConfig.js";
import { Context } from "./Context.js";
import { SessionSettingsVariablesValue } from "./SessionSettingsVariablesValue.js";
import { Tool } from "./Tool.js";
export declare const SessionSettings: core.serialization.ObjectSchema<serializers.empathicVoice.SessionSettings.Raw, Hume.empathicVoice.SessionSettings>;
export declare namespace SessionSettings {
    interface Raw {
        audio?: AudioConfiguration.Raw | null;
        builtin_tools?: BuiltinToolConfig.Raw[] | null;
        context?: Context.Raw | null;
        custom_session_id?: string | null;
        language_model_api_key?: string | null;
        metadata?: Record<string, unknown> | null;
        system_prompt?: string | null;
        tools?: Tool.Raw[] | null;
        type: "session_settings";
        variables?: Record<string, SessionSettingsVariablesValue.Raw> | null;
        voice_id?: string | null;
    }
}
