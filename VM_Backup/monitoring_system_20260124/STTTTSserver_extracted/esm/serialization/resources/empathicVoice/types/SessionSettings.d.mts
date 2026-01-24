import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AudioConfiguration } from "./AudioConfiguration.mjs";
import { BuiltinToolConfig } from "./BuiltinToolConfig.mjs";
import { Context } from "./Context.mjs";
import { SessionSettingsVariablesValue } from "./SessionSettingsVariablesValue.mjs";
import { Tool } from "./Tool.mjs";
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
