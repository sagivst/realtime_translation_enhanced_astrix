import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ContextType } from "./ContextType.mjs";
export declare const Context: core.serialization.ObjectSchema<serializers.empathicVoice.Context.Raw, Hume.empathicVoice.Context>;
export declare namespace Context {
    interface Raw {
        text: string;
        type?: ContextType.Raw | null;
    }
}
