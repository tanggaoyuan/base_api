import { RequestChain, Cache } from "request_chain/core";
import { PassThrough } from "stream";
declare class YoutubeApi {
    private chain;
    private AddyoutubeToken;
    private agent;
    constructor(options: {
        request: RequestChain.RequestFn;
        localCache: Cache;
        interceptor?: RequestChain.InterceptorFn;
        agent?: any;
    });
    parseVideoId(url: string): string;
    queryVideos(data: {
        keyword: string;
        page: number;
        limit: number;
    }): Promise<any[]>;
    requestTubedown(id: string): Promise<any>;
    requestAddyoutube(id: string): Promise<{
        title: string;
        formats: any[];
    }>;
    requestSaveForm(id: string): Promise<{
        title: string;
        formats: any[] | {
            type: string;
            url: string;
            name: string;
            ext: string;
        }[];
    }>;
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
        videoId: string;
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
export default YoutubeApi;
//# sourceMappingURL=YoutubeApi.d.ts.map