import { RequestChain, Cache, RequestChainResponse } from "request_chain/core";
import { Downloader } from "request_chain/node";
declare class AliCloudApi {
    chain: RequestChain;
    private local_cache;
    private static readonly TIME_ONE_DAY;
    private static readonly TIME_ONE_MINUTE;
    constructor(options: {
        request: RequestChain.RequestFn;
        localCache: Cache;
        interceptor?: RequestChain.InterceptorFn;
    });
    /**
     * 随机的设备id
     * @returns
     */
    generateRandomDeviceId(): any;
    static DeviceRefere: string;
    static WebRefere: string;
    /**
     * 根据设备标识 生成设备ID
     */
    generateDeviceId(): any;
    x_signature(params: {
        privateKeyHex: string;
        app_id: string;
        x_device_id: string;
        user_id: string;
        nonce?: number;
    }): string;
    generatePrivateKeyHex(params: {
        token: string;
        app_id: string;
        x_device_id: string;
        user_id: string;
    }): Promise<{
        privateKeyHex: string;
        publicKeyHex: string;
    }>;
    generateRequestParams(parmas: {
        token?: string;
        app_id: string;
        x_device_id: string;
        drive_id: string;
        user_id: string;
        privateKeyHex: string;
    }): AliCloudApi.RequestParams;
    reportTask(slice_num: number, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    /**
     * 获取云盘配置信息，如app_id、client_id
     * 默认缓存1天
     */
    getConfig(): RequestChainResponse<AliCloudApi.AliConfig>;
    /**
     * 获取扫码登录的扫码链接、ck、t，需要生成二维码
     * 默认缓存10分钟
     */
    getLoginQrCodeUrl(): RequestChainResponse<AliCloudApi.LoginQrCode>;
    /**
      * 检查扫码登录状态，如果成功返回token信息
      *  qrCodeStatus = CONFIRMED
      *  const token = JSON.parse(
              Buffer.from(bizExt, 'base64').toString('utf-8'),
        );
    */
    queryQrCodeStatus(params: {
        ck: string;
        t: number;
    }): RequestChainResponse<AliCloudApi.LoginQrCodeStatus>;
    /**
     * 刷新凭证
     * @param app_id
     * @param refresh_token
     * @returns
     */
    refreshToken(app_id: string, refresh_token: string): RequestChainResponse<AliCloudApi.TokenInfo>;
    logout(request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    /**
     * 二维码登录
     */
    qrLogin(listener: (data: {
        msg: string;
        status: "init" | "qr" | "check" | "expired" | "canceled" | "scaned" | "confirmed";
        data?: any;
    }) => void | Promise<void>): Promise<AliCloudApi.LoginInfo>;
    /**
     * 获取个人信息和 drive_id = resource_drive_id
     */
    getUserInfo(token: string): RequestChainResponse<AliCloudApi.UserInfo>;
    /**
     * 获取文件目录
     */
    getDirs(params: {
        limit?: number;
        all?: boolean;
        parent_file_id?: string;
        order_direction?: "DESC" | "ASC";
        /**
         * 下一页  next_marker
         */
        marker?: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<{
        next_marker: string;
        items: AliCloudApi.FileDirItem[];
    }>;
    /**
     * 获取文件信息
     * @param file_id
     * @returns
     */
    getFileInfo(file_id: string, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.FileDirItem>;
    /**
     * 通过路径获取文件信息
     * @param file_path
     * @returns
     */
    getFileInfoByPath(file_path: string, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.FileDirItem>;
    /**
     * 获取下载地址,默认4小时
     * 返回 header 里面的 access-control-allow-origin  在下载时的 Referer进行设置
     * @param file_id   id
     * @returns
     */
    getDownloadUrl(params: {
        file_id: string;
        os?: "web" | "Mac" | "Windows" | "iOS" | "Android" | "Browser" | "Unknown";
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.DownloadDetail>;
    generateProofCode(buf: Buffer, token: string): {
        proof_code: string;
        content_hash: string;
        content_hash_name: string;
        proof_version: string;
    };
    generatePreHash(buf: Buffer): {
        pre_hash: string;
    };
    /**
     * 扔进回收站
     */
    trashRecycleBin(file_ids: Array<string>, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    /**
     * 回收站还原
     */
    restoreRecycleBin(file_id: string, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    /**
     * 回收站列表
     */
    getRecycleBins(params: {
        limit?: number;
        all?: boolean;
        marker?: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<{
        items: AliCloudApi.FileDirItem[];
        next_marker: string;
    }>;
    /**
     * 彻底删除
     * @param file_id
     * @returns
     */
    delete(file_ids: Array<string>, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    /**
     * 搜索文件
     * @param params
     * @returns
     */
    searchFile(params: {
        parent_file_id?: string;
        name: string;
        marker?: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<{
        items: AliCloudApi.FileDirItem[];
        next_marker: string;
    }>;
    /**
     * 创建文件
     * @param params
     * @returns
     */
    createDir(params: {
        parent_file_id?: string;
        name: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.DirInfo>;
    /**
     * 检查创建路径文件
     * @param cloud_path
     * @returns
     */
    checkCreateDirByPath(cloud_path: string, request_params: AliCloudApi.RequestParams): Promise<AliCloudApi.DirInfo>;
    downloadTask(params: {
        file: {
            download_url?: string;
            file_id: string;
            size: number;
            name: string;
        };
        part_size?: number;
        temp_dir_path?: string;
        referer?: string;
    }, request_params: AliCloudApi.RequestParams): Promise<Downloader>;
    /**
     *  遍历获取目录文件树
     */
    traverseDirs(file_id: string, request_params: AliCloudApi.RequestParams): Promise<AliCloudApi.FileDirTree>;
    /**
     * 获取具有下载地址的文件树
     */
    extractLinksFromDirs(params: {
        file_id: string;
        os?: "web" | "Mac" | "Windows" | "iOS" | "Android" | "Browser" | "Unknown";
    }, request_params: AliCloudApi.RequestParams): Promise<AliCloudApi.FileDirTree>;
    private time_ref;
    download(params: {
        file_id: string;
        save_dir_path: string;
        check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
        part_size?: number;
        temp_path?: string;
        concurrent?: number;
    }, request_params: AliCloudApi.RequestParams, onProgress?: (data: Record<string, {
        progress: number;
        total: number;
        loaded: number;
        name: string;
    }>) => void): Promise<{
        code: number;
        message: string;
    } | {
        code: number;
        msg: string;
    }>;
    uploadTask(params: {
        start_index?: number;
        source_path: string;
        parent_file_id?: string;
    }, request_params: AliCloudApi.RequestParams): Promise<never> | {
        upload: () => Promise<{
            file_id: string;
            name: string;
            parent_file_id: string;
            size: number;
            content_hash: string;
        }>;
        stop: () => void;
        pause: () => void;
        onProgress: (fn: (data: {
            loaded: number;
            total: number;
            progress: number;
            name: string;
        }, part: {
            current: number;
            total: number;
        }) => void) => () => void;
        onStatus: (fn: (status: "pending" | "wait" | "done" | "stop", part: {
            current: number;
            total: number;
        }) => void) => () => void;
        finish: () => Promise<{
            file_id: string;
            name: string;
            parent_file_id: string;
            size: number;
            content_hash: string;
        }>;
        readonly status: "pending" | "wait" | "done" | "stop";
    };
    uploadFile(params: {
        source_path: string;
        parent_file_id?: string;
        check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
    }, request_params: AliCloudApi.RequestParams, onProgress?: (data: {
        loaded: number;
        total: number;
        progress: number;
        name: string;
    }) => void): Promise<{
        code: number;
        name: string;
        message: any;
    }>;
    upload(params: {
        /**
         * 具体文件或者目录
         */
        source_path: string;
        parent_file_id?: string;
        check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
        concurrent?: number;
    }, request_params: AliCloudApi.RequestParams, onProgress?: (data: Record<string, {
        progress: number;
        total: number;
        loaded: number;
        name: string;
    }>) => void): Promise<{
        code: number;
        message: string;
    }>;
    getNotes(params: {
        limit: number;
        status?: number;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<{
        result: Array<AliCloudApi.NoteItem>;
        marker: string;
        total_count: number;
    }>;
    createNote(params: {
        title: string;
        summary?: string;
        value: Array<AliCloudApi.NoteTag>;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.NoteItem>;
    createNoteText(params: {
        title: string;
        value: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.NoteItem>;
    getNote(doc_id: string, request_params: AliCloudApi.RequestParams): RequestChainResponse<AliCloudApi.NoteItem>;
    editNote(params: {
        ops: Array<AliCloudApi.NoteAction>;
        doc_id: string;
        version: number;
        summary?: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    editNoteText(params: {
        doc_id: string;
        version: number;
        value: string;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
    updateNoteStatus(params: {
        doc_ids: Array<string>;
        /**
         * 0取消顶置  1顶置 2软删除  3未知操作 4删除
         */
        operation: number;
    }, request_params: AliCloudApi.RequestParams): RequestChainResponse<any>;
}
declare namespace AliCloudApi {
    type NoteAction = {
        op: "add" | "remove" | "replace";
        /**
         * 修改第几个数组的数据内容
         */
        path: number;
        value: NoteTag;
    };
    type NoteTag = [string, Record<string, any>, NoteTag | string];
    interface NoteItem {
        status: number;
        top: number;
        title: string;
        summary: string;
        media: string;
        type: string;
        value: Array<any>;
        version: string;
        user_id: string;
        doc_id: string;
        drive_id: string;
        created_at: number;
        updated_at: number;
        media_list: string[];
    }
    interface RequestParams {
        header: {
            Authorization?: string;
            "x-signature": string;
            "x-device-id": string;
        };
        data: {
            user_id: string;
            drive_id: string;
            app_id: string;
        };
        token?: string;
    }
    interface LoginInfo {
        role: string;
        loginType: string;
        expiresIn: number;
        requestId: string;
        state: string;
        isFirstLogin: boolean;
        needLink: boolean;
        pathStatus: string;
        nickName: string;
        needRpVerify: boolean;
        avatar: string;
        accessToken: string;
        userName: string;
        userId: string;
        defaultDriveId: string;
        existLink: any[];
        expireTime: string;
        dataPinSetup: boolean;
        tokenType: string;
        dataPinSaved: boolean;
        refreshToken: string;
        status: string;
        user_data: {
            DingDingRobotUrl: string;
            EncourageDesc: string;
            FeedBackSwitch: boolean;
            FollowingDesc: string;
            ding_ding_robot_url: string;
            encourage_desc: string;
            feed_back_switch: boolean;
            following_desc: string;
        };
    }
    interface AliConfig {
        app_id: string;
        aliyun_drive_env: string;
        auth_endpoint: string;
        base_url: string;
        capacity_rule: string;
        capacity_recycle_rule: string;
        cdnHost: string;
        client_id: string;
        duplicated_filename_check_batch_threshold: number;
        enable_edit_mode: boolean;
        enable_share: boolean;
        feed_title_max_length: number;
        file_download: boolean;
        folder_download: boolean;
        max_auto_download_count: number;
        max_download_count: number;
        max_download_size: number;
        max_share: number;
        max_unzip_size: number;
        membership_agreement: string;
        member_endpoint: string;
        user_endpoint: string;
        membership_privileges: string;
        multi_download: boolean;
        open_endpoint: string;
        pds_endpoint: string;
        pdsapi_endpoint: string;
        redirect_uri: string;
        share_folder: boolean;
        share_promotion_url: string;
        share_promotion: boolean;
        share_verify: boolean;
        show_iv_modal: boolean;
        show_share_tip: boolean;
        subscription_faq_path: string;
        subscription_recommended_limit: number;
        sv_endpoint: string;
        vault_out_of_storage_faq_path: string;
        show_recyclebin_notice: boolean;
        recyclebin_notice_url: string;
        recyclebin_due_date: string;
        user_page_path: string;
        disable_sidebar_fold: boolean;
        sign_in_goods_url: string;
        member_dispatcher_url: string;
        quick_share_max_share_times: number;
        quick_share_max_save_people: number;
        quick_share_max_valid_day: number;
        with_quick_share: boolean;
        file_sharing_url: string;
        with_move_to_Resource: boolean;
        with_move_to_Resource_and_limit: boolean;
        tingwu_award_time_val: string;
        side_banner_config: string;
        open_applications_home: string;
        open_applications_detail: string;
    }
    interface LoginQrCode {
        content: {
            data: {
                t: number;
                codeContent: string;
                ck: string;
                resultCode: number;
                processFinished: boolean;
            };
            status: number;
            success: boolean;
        };
    }
    interface LoginQrCodeStatus {
        content: {
            data: {
                loginResult: string;
                loginSucResultAction: string;
                st: string;
                qrCodeStatus: "EXPIRED" | "SCANED" | "NEW" | "CONFIRMED" | "CANCELED";
                loginType: string;
                bizExt: string;
                loginScene: string;
                resultCode: number;
                appEntrance: string;
                smartlock: boolean;
                processFinished: boolean;
            };
            status: number;
            success: boolean;
        };
    }
    interface UserInfo {
        avatar: string;
        email: string;
        phone: string;
        role: string;
        status: string;
        description: string;
        punishments: any | null;
        creator: string;
        backup_drive_id: string;
        /**
         * 接口需要的 drive_id
         */
        resource_drive_id: string;
        user_id: string;
        domain_id: string;
        user_name: string;
        nick_name: string;
        default_drive_id: string;
        sbox_drive_id: string | null;
        created_at: number;
        updated_at: number;
        user_data: Record<string, unknown>;
        punish_flag: any | null;
        default_location: string;
        deny_change_password_by_self: boolean;
        expire_at: number | null;
        last_login_time: number;
        need_change_password_next_login: boolean;
        phone_region: string;
        vip_identity: string;
        creator_level: any | null;
        display_name: string;
        is_new: boolean;
    }
    interface TokenInfo {
        default_sbox_drive_id: string;
        role: string;
        device_id: string;
        user_name: string;
        need_link: boolean;
        expire_time: string;
        pin_setup: boolean;
        need_rp_verify: boolean;
        avatar: string;
        user_data: {
            DingDingRobotUrl: string;
            EncourageDesc: string;
            FeedBackSwitch: boolean;
            FollowingDesc: string;
            ding_ding_robot_url: string;
            encourage_desc: string;
            feed_back_switch: boolean;
            following_desc: string;
        };
        token_type: string;
        access_token: string;
        default_drive_id: string;
        domain_id: string;
        path_status: string;
        refresh_token: string;
        is_first_login: boolean;
        user_id: string;
        nick_name: string;
        exist_link: any[];
        state: string;
        expires_in: number;
        status: string;
    }
    interface FileDirItem {
        created_at: string;
        drive_id: string;
        file_id: string;
        name: string;
        parent_file_id: string;
        starred: boolean;
        sync_device_flag: boolean;
        sync_flag: boolean;
        sync_meta: string;
        type: "file" | "folder";
        updated_at: string;
        url: string;
        download_url?: string;
        user_meta: string;
        user_tags: {
            channel: string;
            client: string;
            device_id: string;
            device_name: string;
            version: string;
        };
        mime_type: string;
        file_extension: string;
        category: string;
        content_hash: string;
        thumbnail: string;
        size: number;
    }
    interface DownloadDetail {
        domain_id: string;
        drive_id: string;
        file_id: string;
        revision_id: string;
        method: string;
        url: string;
        expiration: string;
        size: number;
        crc64_hash: string;
        content_hash: string;
        content_hash_name: string;
        punish_flag: number;
        meta_name_punish_flag: number;
        meta_name_investigation_status: number;
    }
    interface DirInfo {
        domain_id: string;
        drive_id: string;
        encrypt_mode: string;
        file_id: string;
        file_name: string;
        parent_file_id: string;
        type: string;
    }
    interface UploadDetail {
        parent_file_id: string;
        upload_id: string;
        rapid_upload: boolean;
        type: string;
        file_id: string;
        revision_id: string;
        domain_id: string;
        drive_id: string;
        file_name: string;
        encrypt_mode: string;
        location: string;
        created_at: string;
        updated_at: string;
        part_info_list: Array<{
            part_number: number;
            part_size: number;
            upload_url: string;
            internal_upload_url: string;
            content_type: string;
        }>;
    }
    interface FileDirTree extends FileDirItem {
        children?: FileDirTree[];
    }
}
export default AliCloudApi;
//# sourceMappingURL=AliCloudApi.d.ts.map