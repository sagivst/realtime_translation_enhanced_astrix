import type * as ElevenLabs from "../../../../../../../../api/index";
import * as core from "../../../../../../../../core";
import type * as serializers from "../../../../../../../index";
import { GetKnowledgeBaseFileResponseModel } from "../../../../../../../types/GetKnowledgeBaseFileResponseModel";
import { GetKnowledgeBaseTextResponseModel } from "../../../../../../../types/GetKnowledgeBaseTextResponseModel";
import { GetKnowledgeBaseUrlResponseModel } from "../../../../../../../types/GetKnowledgeBaseUrlResponseModel";
export declare const DocumentsUpdateResponse: core.serialization.Schema<serializers.conversationalAi.knowledgeBase.DocumentsUpdateResponse.Raw, ElevenLabs.conversationalAi.knowledgeBase.DocumentsUpdateResponse>;
export declare namespace DocumentsUpdateResponse {
    type Raw = DocumentsUpdateResponse.Url | DocumentsUpdateResponse.File | DocumentsUpdateResponse.Text;
    interface Url extends GetKnowledgeBaseUrlResponseModel.Raw {
        type: "url";
    }
    interface File extends GetKnowledgeBaseFileResponseModel.Raw {
        type: "file";
    }
    interface Text extends GetKnowledgeBaseTextResponseModel.Raw {
        type: "text";
    }
}
