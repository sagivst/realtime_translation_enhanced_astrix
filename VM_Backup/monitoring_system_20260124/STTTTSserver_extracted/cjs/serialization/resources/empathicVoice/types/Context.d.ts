import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ContextType } from "./ContextType.js";
export declare const Context: core.serialization.ObjectSchema<serializers.empathicVoice.Context.Raw, Hume.empathicVoice.Context>;
export declare namespace Context {
    interface Raw {
        text: string;
        type?: ContextType.Raw | null;
    }
}
