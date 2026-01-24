import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceId } from "./VoiceId.js";
import { VoiceName } from "./VoiceName.js";
export declare const VoiceRef: core.serialization.Schema<serializers.empathicVoice.VoiceRef.Raw, Hume.empathicVoice.VoiceRef>;
export declare namespace VoiceRef {
    type Raw = VoiceId.Raw | VoiceName.Raw;
}
