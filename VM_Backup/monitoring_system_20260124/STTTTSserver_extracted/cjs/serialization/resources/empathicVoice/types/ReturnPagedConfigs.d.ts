import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnConfig } from "./ReturnConfig.js";
export declare const ReturnPagedConfigs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedConfigs.Raw, Hume.empathicVoice.ReturnPagedConfigs>;
export declare namespace ReturnPagedConfigs {
    interface Raw {
        configs_page?: ReturnConfig.Raw[] | null;
        page_number?: number | null;
        page_size?: number | null;
        total_pages: number;
    }
}
