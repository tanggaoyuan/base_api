import { Wrapper, RequestChain, Cache } from "request_chain/core";
import { LocalCache } from "request_chain/node";
import { PassThrough } from "stream";
declare class YoubetuApi {
    private chain;
    private AddyoutubeToken;
    private agent;
    constructor(options: {
        request: RequestChain.RequestFn;
        localCache: Cache;
        interceptor?: RequestChain.Interceptor;
        agent?: any;
    });
    queryVideos(data: {
        keyword: string;
        page: number;
        limit: number;
    }): Promise<any[]>;
    private requestTubedown;
    private requestAddyoutube;
    private requestSaveForm;
    format(params: {
        title: string;
        formats: Array<any>;
    }): {
        video: {
            mp4s: any[];
            webms: any[];
        };
        audio: {
            mp4s: any[];
            m4as: any[];
            webms: any[];
        };
        title: string;
    };
    getMediaInfo(id: string): Promise<{
        method: string;
        video: {
            mp4s: any[];
            webms: any[];
        };
        audio: {
            mp4s: any[];
            m4as: any[];
            webms: any[];
        };
        title: string;
    }>;
    downloadSource(format: any, onProgress?: (data: {
        progress?: number;
        loaded?: number;
        total?: number;
    }) => void): Promise<PassThrough>;
}
export { Wrapper, LocalCache };
export default YoubetuApi;
//# sourceMappingURL=YoubetuApi.d.ts.map