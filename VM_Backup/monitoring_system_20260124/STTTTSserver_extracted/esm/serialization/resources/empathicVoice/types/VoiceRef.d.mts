import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceId } from "./VoiceId.mjs";
import { VoiceName } from "./VoiceName.mjs";
export declare const VoiceRef: core.serialization.Schema<serializers.empathicVoice.VoiceRef.Raw, Hume.empathicVoice.VoiceRef>;
export declare namespace VoiceRef {
    type Raw = VoiceId.Raw | VoiceName.Raw;
}
