"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("request_chain/core");
const node_1 = require("request_chain/node");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
const os_1 = __importDefault(require("os"));
const elliptic_1 = __importDefault(require("elliptic"));
const node_machine_id_1 = __importDefault(require("node-machine-id"));
const uuid_1 = require("uuid");
const EC = elliptic_1.default.ec;
const secp = new EC("secp256k1");
const headers = {
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "none",
    // Origin: "https://www.alipan.com",
    Referer: "https://www.aliyundrive.com/",
    // Referer: "https://www.alipan.com/",
    "x-canary": "client=Windows,app=adrive,version=v6.4.2",
    // "x-canary": "client=web,app=adrive,version=v6.4.2",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) aDrive/6.3.1 Chrome/112.0.5615.165 Electron/24.1.3.7 Safari/537.36",
};
/**
 * 限制并发任务数量
 * @param {Function[]} tasks - 任务函数数组，每个任务函数返回一个 Promise
 * @param {number} n - 最大并发数量
 * @returns {Promise<any[]>} - 所有任务完成后的结果数组
 */
function limitConcurrency(tasks_1) {
    return __awaiter(this, arguments, void 0, function* (tasks, n = 2) {
        const results = [];
        let index = 0;
        const executeTask = () => __awaiter(this, void 0, void 0, function* () {
            while (index < tasks.length) {
                const i = index++;
                try {
                    results[i] = yield tasks[i]();
                }
                catch (e) {
                    results[i] = e;
                }
            }
        });
        const workers = Array.from({ length: n }, executeTask);
        yield Promise.all(workers);
        return results;
    });
}
class AliCloudApi {
    constructor(options) {
        this.local_cache = options.localCache;
        this.chain = new core_1.RequestChain({
            local: this.local_cache,
            request: options.request,
            interceptor: options.interceptor,
        }, {
            timeout: 10000,
            headers,
        });
    }
    /**
     * 随机的设备id
     * @returns
     */
    generateRandomDeviceId() {
        // return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        //   /[xy]/g,
        //   function (e) {
        //     var t = (16 * Math.random()) | 0;
        //     return ("x" == e ? t : (3 & t) | 8).toString(16);
        //   }
        // );
        return (0, uuid_1.v4)();
    }
    /**
     * 根据设备标识 生成设备ID
     */
    generateDeviceId() {
        const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
        const platform = os_1.default.platform();
        const arch = os_1.default.arch();
        const hostname = os_1.default.hostname();
        const deviceInfo = `${platform}-${arch}-${hostname}-${node_machine_id_1.default.machineIdSync()}`;
        const uuid = (0, uuid_1.v5)(deviceInfo, NAMESPACE);
        return uuid;
    }
    x_signature(params) {
        const { app_id, x_device_id, user_id, nonce, privateKeyHex } = params;
        try {
            const message = `${app_id}:${x_device_id}:${user_id}:${nonce}`;
            const hash = crypto_1.default.createHash("sha256").update(message).digest("hex");
            const result = secp
                .keyFromPrivate(privateKeyHex, "hex")
                .sign(hash, { canonical: true });
            const recovery = result.recoveryParam;
            const [r, s] = [result.r.toString("hex"), result.s.toString("hex")];
            return `${r}${s}0${recovery}`;
        }
        catch (error) {
            return undefined;
        }
    }
    generatePrivateKeyHex(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const keyPair = secp.genKeyPair();
            const privateKeyHex = keyPair.getPrivate("hex");
            const publicKeyHex = keyPair.getPublic("hex");
            yield this.chain
                .post("https://api.aliyundrive.com/users/v1/users/device/create_session")
                .send({
                deviceName: os_1.default.hostname().toLocaleUpperCase() || "Edge浏览器",
                modelName: "Windows客户端",
                pubKey: publicKeyHex,
                user_id: params.user_id,
            })
                .setHeaders({
                Authorization: `Bearer ${params.token}`,
                "x-signature": this.x_signature(Object.assign(Object.assign({}, params), { privateKeyHex })),
                "x-device-id": params.x_device_id,
            });
            return { privateKeyHex, publicKeyHex };
        });
    }
    generateRequestParams(parmas) {
        return {
            header: {
                Authorization: parmas.token ? `Bearer ${parmas.token}` : undefined,
                "x-signature": this.x_signature(parmas),
                "x-device-id": parmas.x_device_id,
            },
            data: {
                user_id: parmas.user_id,
                drive_id: parmas.drive_id,
                app_id: parmas.app_id,
            },
            token: parmas.token,
        };
    }
    reportTask(slice_num, request_params) {
        return this.chain
            .post("https://api.aliyundrive.com/adrive/v2/file/reportDownloadTask")
            .send(Object.assign({ slice_num }, request_params.data))
            .setHeaders(request_params.header)
            .cache("memory", 2000)
            .enableMergeSame();
    }
    /**
     * 获取云盘配置信息，如app_id、client_id
     * 默认缓存1天
     */
    getConfig() {
        const promise = this.chain.request({
            url: "https://www.alipan.com/drive/file/all",
            method: "GET",
            cache: "local",
            expires: AliCloudApi.TIME_ONE_DAY,
            mergeSame: true,
        });
        const getData = promise.getData.bind(promise);
        promise.getData = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield getData();
                const [text] = (_a = response
                    .replace(/\n/g, "")
                    .match(/var Global = \{(.+?)\}/i)) !== null && _a !== void 0 ? _a : [""];
                const result = eval(text.replace("var ", "global."));
                return result;
            }
            catch (error) {
                return Promise.reject(error);
            }
        });
        return promise;
    }
    /**
     * 获取扫码登录的扫码链接、ck、t，需要生成二维码
     * 默认缓存10分钟
     */
    getLoginQrCodeUrl() {
        return this.chain.request({
            url: "https://passport.aliyundrive.com/newlogin/qrcode/generate.do?appName=aliyun_drive&fromSite=52",
            method: "GET",
            cache: "local",
            expires: AliCloudApi.TIME_ONE_MINUTE * 10,
        });
    }
    /**
      * 检查扫码登录状态，如果成功返回token信息
      *  qrCodeStatus = CONFIRMED
      *  const token = JSON.parse(
              Buffer.from(bizExt, 'base64').toString('utf-8'),
        );
    */
    queryQrCodeStatus(params) {
        const data = Object.assign({ appName: "aliyun_drive", appEntrance: "web_default", fromSite: 52, navPlatform: "Win32", isIframe: true, documentReferer: "https://auth.alipan.com/", defaultView: "qrcode" }, params);
        return this.chain
            .request({
            url: "https://passport.aliyundrive.com/newlogin/qrcode/query.do?appName=aliyun_drive&fromSite=52",
            method: "POST",
            data,
        })
            .headerFormUrlencoded();
    }
    /**
     * 刷新凭证
     * @param app_id
     * @param refresh_token
     * @returns
     */
    refreshToken(app_id, refresh_token) {
        return this.chain.request({
            url: "https://auth.aliyundrive.com/v2/account/token",
            method: "POST",
            mergeSame: true,
            data: {
                grant_type: "refresh_token",
                refresh_token,
                app_id,
            },
        });
    }
    logout(request_params) {
        return this.chain
            .post("https://api.aliyundrive.com/users/v1/users/device_logout")
            .send(request_params.data)
            .setHeaders(request_params.header);
    }
    /**
     * 二维码登录
     */
    qrLogin(listener) {
        return __awaiter(this, void 0, void 0, function* () {
            yield listener({ msg: "获取登录连接", status: "init" });
            const QrResponse = yield this.getLoginQrCodeUrl();
            const { ck, codeContent, t } = QrResponse.data.content.data;
            yield listener({ msg: "生成二维码", status: "qr", data: codeContent });
            yield listener({ msg: "检查扫码状态", status: "check" });
            return new Promise((resolve, reject) => {
                const checkStatus = () => __awaiter(this, void 0, void 0, function* () {
                    const CheckResponse = yield this.queryQrCodeStatus({
                        ck,
                        t,
                    });
                    const { qrCodeStatus, bizExt } = CheckResponse.data.content.data;
                    if (["EXPIRED"].includes(qrCodeStatus)) {
                        yield listener({ msg: "登录过期", status: "expired" });
                        reject(Error("登录过期"));
                        return;
                    }
                    if (["CANCELED"].includes(qrCodeStatus)) {
                        yield listener({ msg: "用户取消登录", status: "canceled" });
                        reject(Error("用户取消登录"));
                        return;
                    }
                    if (["SCANED"].includes(qrCodeStatus)) {
                        yield listener({
                            msg: "扫码成功，待确认登录",
                            status: "scaned",
                        });
                    }
                    if (["CONFIRMED"].includes(qrCodeStatus)) {
                        const info = JSON.parse(Buffer.from(bizExt, "base64").toString("utf-8"));
                        yield listener({ msg: "登陆成功", status: "confirmed" });
                        resolve(info.pds_login_result);
                        return;
                    }
                    setTimeout(() => {
                        checkStatus();
                    }, 2000);
                });
                checkStatus();
            });
        });
    }
    /**
     * 获取个人信息和 drive_id = resource_drive_id
     */
    getUserInfo(token) {
        return this.chain
            .request({
            url: "https://user.aliyundrive.com/v2/user/get",
            method: "POST",
        })
            .setHeaders({
            Authorization: token ? `Bearer ${token}` : undefined,
        });
    }
    /**
     * 获取文件目录
     */
    getDirs(params, request_params) {
        return this.chain
            .post("https://api.aliyundrive.com/adrive/v3/file/list?jsonmask=next_marker%2Citems(name%2Cfile_id%2Cdrive_id%2Ctype%2Csize%2Ccreated_at%2Cupdated_at%2Ccategory%2Cfile_extension%2Cparent_file_id%2Cmime_type%2Cstarred%2Cthumbnail%2Curl%2Cstreams_info%2Ccontent_hash%2Cuser_tags%2Cuser_meta%2Ctrashed%2Cvideo_media_metadata%2Cvideo_preview_metadata%2Csync_meta%2Csync_device_flag%2Csync_flag%2Cpunish_flag%2Cfrom_share_id)")
            .send(Object.assign(Object.assign({ parent_file_id: "root", limit: 20, all: false, url_expire_sec: 14400, image_thumbnail_process: "image/resize,w_400/format,jpeg", image_url_process: "image/resize,w_1920/format,jpegjpeg", video_thumbnail_process: "video/snapshot,t_120000,f_jpg,m_lfit,w_400,ar_auto,m_fast", fields: "*", order_by: "updated_at", order_direction: "DESC" }, params), request_params.data))
            .setHeaders(request_params.header);
    }
    /**
     * 获取文件信息
     * @param file_id
     * @returns
     */
    getFileInfo(file_id, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get",
            method: "POST",
            data: Object.assign({ file_id, url_expire_sec: 14400, office_thumbnail_process: "image/resize,w_400/format,jpeg", image_thumbnail_process: "image/resize,w_400/format,jpeg", image_url_process: "image/resize,w_1920/format,jpeg", video_thumbnail_process: "video/snapshot,t_106000,f_jpg,ar_auto,m_fast,w_400" }, request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 通过路径获取文件信息
     * @param file_path
     * @returns
     */
    getFileInfoByPath(file_path, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get_by_path",
            method: "POST",
            data: Object.assign({ file_path }, request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 获取下载地址,默认4小时
     * 返回 header 里面的 access-control-allow-origin  在下载时的 Referer进行设置
     * @param file_id   id
     * @returns
     */
    getDownloadUrl(params, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get_download_url",
            method: "POST",
            cache: "local",
            expires: 14400000,
            data: Object.assign(Object.assign(Object.assign({}, params), request_params.data), { expire_sec: 14400, os: undefined }),
        })
            .setHeaders(Object.assign(Object.assign({}, request_params.header), { "x-canary": `client=${params.os || "web"},app=adrive,version=v6.4.2` }));
    }
    generateProofCode(buf, token) {
        const buffa = Buffer.from(token);
        const md5a = crypto_1.default.createHash("md5").update(buffa).digest("hex");
        const start = Number(BigInt("0x" + md5a.substring(0, 16)) % BigInt(buf.byteLength));
        const end = Math.min(start + 8, buf.byteLength);
        const buffb = buf.subarray(start, end);
        const proof_code = buffb.toString("base64");
        const content_hash_name = "sha1";
        const content_hash = crypto_1.default
            .createHash(content_hash_name)
            .update(buf)
            .digest("hex")
            .toLocaleUpperCase();
        return {
            proof_code,
            content_hash,
            content_hash_name,
            proof_version: "v1",
        };
    }
    generatePreHash(buf) {
        const pre_hash = crypto_1.default
            .createHash("sha1")
            .update(buf.subarray(0, 1024))
            .digest("hex")
            .toLocaleLowerCase();
        return { pre_hash };
    }
    /**
     * 扔进回收站
     */
    trashRecycleBin(file_ids, request_params) {
        if (file_ids.length >= 2) {
            return this.chain
                .request({
                url: "https://api.aliyundrive.com/adrive/v4/batch",
                method: "POST",
                data: {
                    resource: "file",
                    requests: file_ids.map((key) => {
                        return {
                            body: {
                                drive_id: request_params.data.drive_id,
                                file_id: key,
                            },
                            headers: { "Content-Type": "application/json" },
                            id: key,
                            method: "POST",
                            url: "/recyclebin/trash",
                        };
                    }),
                },
            })
                .setHeaders(request_params.header);
        }
        else {
            return this.chain
                .request({
                url: "https://api.aliyundrive.com/v2/recyclebin/trash",
                method: "POST",
                data: Object.assign({ file_id: file_ids[0] }, request_params.data),
            })
                .setHeaders(request_params.header);
        }
    }
    /**
     * 回收站还原
     */
    restoreRecycleBin(file_id, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/recyclebin/restore",
            method: "POST",
            data: Object.assign({ file_id }, request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 回收站列表
     */
    getRecycleBins(params, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/recyclebin/list",
            method: "POST",
            data: Object.assign(Object.assign({ fields: "*", all: false, limit: 50 }, params), request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 彻底删除
     * @param file_id
     * @returns
     */
    delete(file_ids, request_params) {
        if (file_ids.length >= 2) {
            return this.chain
                .request({
                url: "https://api.aliyundrive.com/adrive/v4/batch",
                method: "POST",
                data: {
                    resource: "file",
                    requests: file_ids.map((key) => {
                        return {
                            body: {
                                drive_id: request_params.data.drive_id,
                                file_id: key,
                                permanently: true,
                            },
                            headers: { "Content-Type": "application/json" },
                            id: key,
                            method: "POST",
                            url: "/file/delete",
                        };
                    }),
                },
            })
                .setHeaders(request_params.header);
        }
        else {
            return this.chain
                .request({
                url: "https://api.aliyundrive.com/v3/file/delete",
                method: "POST",
                data: Object.assign(Object.assign({}, request_params.data), { file_id: file_ids[0], permanently: true }),
            })
                .setHeaders(request_params.header);
        }
    }
    /**
     * 搜索文件
     * @param params
     * @returns
     */
    searchFile(params, request_params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v3/file/search",
            method: "POST",
            data: Object.assign({ limit: 100, order_by: "name ASC", query: `parent_file_id = "${params.parent_file_id || "root"}" and (name = "${params.name}")`, marker: params.marker }, request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 创建文件
     * @param params
     * @returns
     */
    createDir(params, request_params) {
        var _a;
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
            method: "POST",
            data: Object.assign(Object.assign({ check_name_mode: "refuse", parent_file_id: (_a = params.parent_file_id) !== null && _a !== void 0 ? _a : "root", type: "folder" }, params), request_params.data),
        })
            .setHeaders(request_params.header);
    }
    /**
     * 检查创建路径文件
     * @param cloud_path
     * @returns
     */
    checkCreateDirByPath(cloud_path, request_params) {
        return __awaiter(this, void 0, void 0, function* () {
            let info;
            const names = cloud_path.split("/");
            if (names[0] === "root") {
                names.shift();
            }
            let existPosition = 0;
            for (let i = names.length; i > 0; i--) {
                try {
                    const dir_path = names.slice(0, i).join("/");
                    const result = yield this.getFileInfoByPath(`/${dir_path}`, request_params).getData();
                    info = {
                        domain_id: "",
                        drive_id: result.drive_id,
                        encrypt_mode: "",
                        file_id: result.file_id,
                        file_name: result.name,
                        parent_file_id: result.parent_file_id,
                        type: result.type,
                    };
                    existPosition = i;
                    break;
                }
                catch (error) {
                    continue;
                }
            }
            if (existPosition <= names.length - 1) {
                const createnames = names.slice(existPosition);
                for (let i = 0; i < createnames.length; i++) {
                    const params = {
                        name: createnames[i],
                        parent_file_id: (info === null || info === void 0 ? void 0 : info.file_id) || "root",
                    };
                    info = yield this.createDir(params, request_params).getData();
                }
            }
            return info;
        });
    }
    downloadTask(params, request_params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { file, temp_dir_path = path_1.default.join(os_1.default.tmpdir(), "yunpan") } = params;
            if (!file.download_url) {
                const response = yield this.getDownloadUrl({
                    file_id: file.file_id,
                    os: file.size > 100 * 1024 * 1024 ? "Windows" : "web",
                    // os: "Windows",
                }, request_params);
                if (!params.referer) {
                    params.referer = response.headers["access-control-allow-origin"];
                }
                file.download_url = response.data.url;
            }
            const downloader = new node_1.Downloader({
                url: file.download_url,
                request: (config) => {
                    return this.chain.request(config);
                },
                fetchFileInfo(config) {
                    return Promise.resolve({
                        name: file.name,
                        file_size: file.size,
                    });
                },
                temp_path: temp_dir_path,
                part_size: params.part_size || 30 * 1024 * 1024,
            });
            downloader.setConfig({
                headers: Object.assign(Object.assign({}, headers), { Connection: "keep-alive", "Accept-Encoding": "", "x-canary": undefined, referer: params.referer || headers.Referer }),
            });
            const download = downloader.download.bind(downloader);
            downloader.download = (...args_1) => __awaiter(this, [...args_1], void 0, function* (concurrent = 2) {
                const stream = yield downloader.startPart(0, {
                    preloaded: 5 * 1024 * 1024,
                    useCache: true,
                });
                yield downloader.waitPartStream(stream);
                return download(concurrent);
            });
            return downloader;
        });
    }
    /**
     *  遍历获取目录文件树
     */
    traverseDirs(file_id, request_params) {
        return __awaiter(this, void 0, void 0, function* () {
            const root = yield this.getFileInfo(file_id, request_params).getData();
            if (root.type === "folder") {
                const traverse = (parent_file_id) => __awaiter(this, void 0, void 0, function* () {
                    let next = "init";
                    let files = [];
                    while (next) {
                        const { items, next_marker } = yield this.getDirs({
                            parent_file_id,
                            limit: 100,
                            marker: next === "init" ? undefined : next,
                        }, request_params).getData();
                        next = next_marker;
                        files = files.concat(items);
                    }
                    for (const file of files) {
                        if (file.type === "folder") {
                            file.children = yield traverse(file.file_id);
                        }
                    }
                    return files;
                });
                const children = yield traverse(root.file_id);
                return Object.assign(Object.assign({}, root), { children });
            }
            else {
                return root;
            }
        });
    }
    /**
     * 获取具有下载地址的文件树
     */
    extractLinksFromDirs(params, request_params) {
        return __awaiter(this, void 0, void 0, function* () {
            const tree = yield this.traverseDirs(params.file_id, request_params);
            let queque = [...tree.children];
            while (queque.length) {
                const file = queque.shift();
                if (file.type === "folder") {
                    queque = queque.concat(file.children);
                }
                else if (!file.download_url) {
                    const response = yield this.getDownloadUrl({ file_id: file.file_id, os: params.os }, request_params).getData();
                    file.download_url = response.url;
                }
            }
            return tree;
        });
    }
    download(params, request_params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { file_id, part_size, temp_path, check_name_mode = "refuse", } = params;
            let progress = {};
            const reportProgress = () => {
                if (!onProgress) {
                    return;
                }
                onProgress(progress);
            };
            const file_info = yield this.getFileInfo(file_id, request_params).getData();
            const download = (file, save_dir_path) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let save_path = path_1.default.join(save_dir_path, (0, sanitize_filename_1.default)(file.name));
                    if (fs_1.default.existsSync(save_path)) {
                        const stat = fs_1.default.statSync(save_path);
                        if (check_name_mode === "refuse") {
                            progress[save_path] = {
                                progress: 100,
                                loaded: stat.size,
                                total: stat.size,
                                name: file_info.name,
                            };
                            reportProgress();
                            return Promise.resolve({
                                code: -1,
                                message: "该文件已存在",
                            });
                        }
                        if (check_name_mode === "compare") {
                            const buf = fs_1.default.readFileSync(save_path);
                            const md5 = crypto_1.default
                                .createHash("sha1")
                                .update(buf)
                                .digest("hex")
                                .toLocaleUpperCase();
                            if (md5 === file_info.content_hash) {
                                progress[save_path] = {
                                    progress: 100,
                                    loaded: stat.size,
                                    total: stat.size,
                                    name: file_info.name,
                                };
                                reportProgress();
                                return Promise.resolve({
                                    code: -1,
                                    msg: "该文件已存在",
                                });
                            }
                        }
                        if (check_name_mode === "auto_rename") {
                            const ext = path_1.default.extname(file_info.name);
                            save_path = save_path.replace(ext, "") + `_${Date.now()}${ext}`;
                        }
                    }
                    const downloader = yield this.downloadTask({
                        part_size,
                        temp_dir_path: temp_path,
                        file,
                    }, request_params);
                    downloader.onProgress((file) => {
                        progress[save_path] = file;
                        reportProgress();
                    });
                    clearInterval(this.time_ref);
                    this.time_ref = setInterval(() => {
                        this.reportTask(2, request_params);
                    }, 4000);
                    yield this.reportTask(0, request_params);
                    yield downloader.download(params.concurrent || 2);
                    yield downloader.save(save_dir_path);
                    yield downloader.deleteDownloadTemp();
                    clearInterval(this.time_ref);
                    yield this.reportTask(0, request_params);
                    return {
                        code: 0,
                        message: "下载完成",
                    };
                }
                catch (error) {
                    return Promise.reject(error);
                }
            });
            const getDirChildren = (file, request_params) => __awaiter(this, void 0, void 0, function* () {
                let next = "init";
                let files = [];
                while (next) {
                    const { items, next_marker } = yield this.getDirs({
                        parent_file_id: file.file_id,
                        limit: 100,
                        marker: next === "init" ? undefined : next,
                    }, request_params).getData();
                    next = next_marker;
                    files = files.concat(items);
                }
                return files;
            });
            const downloadDir = (file, dir_path) => __awaiter(this, void 0, void 0, function* () {
                const save_dir_path = path_1.default.join(dir_path, (0, sanitize_filename_1.default)(file.name));
                fs_1.default.mkdirSync(save_dir_path, { recursive: true });
                const children = yield getDirChildren(file, request_params);
                const dirs = [];
                const files = [];
                for (const file of children) {
                    if (file.type === "folder") {
                        dirs.push(file);
                    }
                    else {
                        files.push(file);
                    }
                }
                for (const file of files) {
                    yield download(file, save_dir_path);
                }
                for (const file of dirs) {
                    yield downloadDir(file, save_dir_path);
                }
                return {
                    code: 0,
                    message: "下载完成",
                };
            });
            if (file_info.type === "folder") {
                return downloadDir(file_info, params.save_dir_path);
            }
            else {
                const save_path = path_1.default.join(params.save_dir_path, (0, sanitize_filename_1.default)(file_info.name));
                return download(file_info, save_path);
            }
        });
    }
    uploadTask(params, request_params) {
        const { source_path, parent_file_id } = params;
        if (!fs_1.default.existsSync(source_path)) {
            return Promise.reject("资源文件不存在");
        }
        const stat = fs_1.default.statSync(source_path);
        const filename = (0, sanitize_filename_1.default)(source_path.split(/\/|\\/).pop());
        const part_info_list = [];
        const sourceBuffer = fs_1.default.readFileSync(source_path);
        const chunk_size = 10485824;
        let partSize = chunk_size; // 10485760
        let partIndex = 0;
        while (sourceBuffer.byteLength > partSize * 8000)
            partSize = partSize + chunk_size;
        while (partIndex * partSize < sourceBuffer.byteLength) {
            part_info_list.push({
                part_number: partIndex + 1,
                part_size: partSize,
            });
            partIndex++;
        }
        part_info_list[partIndex - 1].part_size =
            sourceBuffer.byteLength - (partIndex - 1) * partSize;
        let data = {
            part_info_list,
            parent_file_id,
            name: filename,
            type: "file",
            check_name_mode: "auto_rename",
            size: sourceBuffer.byteLength,
            create_scene: "file_upload",
            device_name: "",
        };
        if (sourceBuffer.byteLength >= 1024000) {
            data = Object.assign(Object.assign({}, data), this.generatePreHash(sourceBuffer));
        }
        else {
            data = Object.assign(Object.assign({}, data), this.generateProofCode(sourceBuffer, request_params.token));
        }
        let upload_index = params.start_index || 0;
        let status = "wait";
        const progress_events = [];
        const status_events = [];
        const onProgress = (fn) => {
            progress_events.push(fn);
            notifyProgress(Math.min(upload_index * chunk_size, sourceBuffer.byteLength));
            return () => {
                const index = progress_events.indexOf(fn);
                index >= 0 && progress_events.splice(index, 1);
            };
        };
        const notifyProgress = (loaded) => {
            const data = {
                loaded,
                total: stat.size,
                progress: Math.round((loaded / stat.size) * 100),
                name: filename,
            };
            progress_events.forEach((fn) => {
                fn(data, {
                    current: upload_index,
                    total: part_info_list.length,
                });
            });
        };
        const onStatus = (fn) => {
            status_events.push(fn);
            notifyStatus(status);
            return () => {
                const index = status_events.indexOf(fn);
                index >= 0 && status_events.splice(index, 1);
            };
        };
        const notifyStatus = (value) => {
            status = value;
            status_events.forEach((fn) => {
                fn(status, {
                    current: upload_index,
                    total: part_info_list.length,
                });
            });
        };
        const noop = () => { };
        const callbaks = [noop, noop, noop];
        const promise = new Promise((resolve, reject) => {
            callbaks[0] = resolve;
            callbaks[1] = reject;
        });
        const upload = () => {
            if (status === "wait") {
                const [resolve, reject] = callbaks;
                const done = (result) => {
                    notifyStatus("done");
                    notifyProgress(stat.size);
                    resolve(Object.assign({ name: filename, size: stat.size, content_hash: data.content_hash }, result));
                };
                const stop = (error) => {
                    notifyStatus("stop");
                    notifyProgress(Math.min(upload_index * chunk_size, sourceBuffer.length));
                    reject(error);
                };
                const pause = () => {
                    notifyStatus("wait");
                    notifyProgress(Math.min(upload_index * chunk_size, sourceBuffer.length));
                };
                notifyStatus("pending");
                const run = () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    try {
                        const uploadInfo = yield this.chain
                            .request({
                            url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                            method: "POST",
                            cache: "local",
                            expires: 2700000, // 45分钟过期
                            data,
                        })
                            .send(request_params.data)
                            .setHeaders(request_params.header)
                            .getData();
                        if (uploadInfo.rapid_upload) {
                            done(uploadInfo);
                            return;
                        }
                        while (upload_index < uploadInfo.part_info_list.length) {
                            const item = uploadInfo.part_info_list[upload_index];
                            const start = upload_index * chunk_size;
                            const end = Math.min(sourceBuffer.byteLength, (upload_index + 1) * chunk_size);
                            const chunk = sourceBuffer.subarray(start, end);
                            try {
                                const req = this.chain.request({
                                    url: item.upload_url,
                                    method: "PUT",
                                    data: chunk,
                                    headers: {
                                        "Content-Type": "",
                                        "Content-Length": `${chunk.byteLength}`,
                                        connection: "keep-alive",
                                    },
                                });
                                callbaks[2] = (value) => {
                                    req.abort(value);
                                };
                                yield req;
                                upload_index++;
                                notifyProgress(upload_index * chunk.length);
                                console.log(params.source_path, "end", upload_index);
                            }
                            catch (error) {
                                if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 409) {
                                    upload_index++;
                                    notifyProgress(upload_index * chunk.length);
                                }
                                else if (error.message === "wait") {
                                    pause();
                                    return;
                                }
                                else {
                                    stop(error);
                                    return;
                                }
                            }
                        }
                        const result = yield this.chain
                            .request({
                            url: "https://api.aliyundrive.com/v2/file/complete",
                            method: "POST",
                            data: Object.assign({ file_id: uploadInfo.file_id, upload_id: uploadInfo.upload_id }, request_params.data),
                        })
                            .setHeaders(request_params.header)
                            .replay(1)
                            .getData();
                        done(result);
                    }
                    catch (error) {
                        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 409) {
                            try {
                                delete data.pre_hash;
                                data = Object.assign(Object.assign({}, data), this.generateProofCode(sourceBuffer, request_params.token));
                                const uploadInfo = yield this.chain
                                    .request({
                                    url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                                    method: "POST",
                                    data,
                                })
                                    .send(request_params.data)
                                    .setHeaders(request_params.header)
                                    .getData();
                                done(uploadInfo);
                            }
                            catch (error) {
                                stop(error);
                                return;
                            }
                        }
                        else {
                            stop(error);
                            return;
                        }
                    }
                });
                run();
            }
            return promise;
        };
        const finish = () => {
            return promise;
        };
        const handler = {
            upload,
            stop: () => {
                return callbaks[2]("stop");
            },
            pause: () => {
                return callbaks[2]("wait");
            },
            onProgress,
            onStatus,
            finish,
            get status() {
                return status;
            },
        };
        return handler;
    }
    uploadFile(params, request_params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { source_path, parent_file_id, check_name_mode } = params;
            let loadeds = [];
            const stat = fs_1.default.statSync(source_path);
            const filename = (0, sanitize_filename_1.default)(source_path.split(/\/|\\/).pop());
            const reportProgress = () => {
                if (!onProgress) {
                    return;
                }
                let loaded = 0;
                loadeds.forEach((value) => {
                    loaded += value;
                });
                onProgress({
                    loaded,
                    total: stat.size,
                    progress: Math.round((loaded / stat.size) * 100),
                    name: filename,
                });
            };
            const { items } = yield this.searchFile({
                name: filename,
                parent_file_id,
            }, request_params).getData();
            const cloud_file = items.find((item) => item.name === filename);
            if (check_name_mode === "refuse" && cloud_file) {
                loadeds = [stat.size];
                reportProgress();
                return {
                    code: -1,
                    name: filename,
                    message: "已有同名文件",
                };
            }
            const filebuf = fs_1.default.readFileSync(source_path);
            const part_info_list = [];
            const chunk_size = 10485824;
            let partSize = chunk_size; // 10485760
            let partIndex = 0;
            while (filebuf.byteLength > partSize * 8000)
                partSize = partSize + chunk_size;
            while (partIndex * partSize < filebuf.byteLength) {
                part_info_list.push({
                    part_number: partIndex + 1,
                    part_size: partSize,
                });
                partIndex++;
            }
            part_info_list[partIndex - 1].part_size =
                filebuf.byteLength - (partIndex - 1) * partSize;
            let data = {
                part_info_list,
                parent_file_id,
                name: filename,
                type: "file",
                check_name_mode: check_name_mode === "compare" ? "overwrite" : check_name_mode,
                size: filebuf.byteLength,
                create_scene: "file_upload",
                device_name: "",
            };
            if (filebuf.byteLength >= 1024000) {
                data = Object.assign(Object.assign({}, data), this.generatePreHash(filebuf));
            }
            else {
                data = Object.assign(Object.assign({}, data), this.generateProofCode(filebuf, request_params.token));
            }
            if (check_name_mode === "compare" && cloud_file) {
                let content_hash = data.content_hash;
                if (!content_hash) {
                    content_hash = crypto_1.default
                        .createHash("sha1")
                        .update(filebuf)
                        .digest("hex")
                        .toLocaleUpperCase();
                }
                if (cloud_file.content_hash === content_hash) {
                    loadeds = [stat.size];
                    reportProgress();
                    return { code: -1, name: filename, message: "文件已存在" };
                }
            }
            try {
                const uploadInfo = yield this.chain
                    .request({
                    url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                    method: "POST",
                    cache: "local",
                    expires: 2700000, // 45分钟过期
                    data,
                })
                    .send(request_params.data)
                    .setHeaders(request_params.header)
                    .getData();
                if (uploadInfo.rapid_upload) {
                    loadeds = [stat.size];
                    reportProgress();
                    return {
                        code: 200,
                        name: filename,
                        message: "上传成功",
                    };
                }
                for (let index = 0; index < uploadInfo.part_info_list.length; index++) {
                    const item = uploadInfo.part_info_list[index];
                    const start = index * chunk_size;
                    const end = Math.min(filebuf.byteLength, (index + 1) * chunk_size);
                    const chunk = filebuf.subarray(start, end);
                    try {
                        yield this.chain.request({
                            url: item.upload_url,
                            method: "PUT",
                            data: chunk,
                            headers: {
                                "Content-Type": "",
                                "Content-Length": `${chunk.byteLength}`,
                                connection: "keep-alive",
                            },
                            onUploadProgress(value) {
                                loadeds[index] = value.loaded;
                                reportProgress();
                            },
                        });
                        loadeds[index] = chunk.byteLength;
                        reportProgress();
                    }
                    catch (error) {
                        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 409) {
                            loadeds[index] = chunk.byteLength;
                            reportProgress();
                        }
                        else {
                            return Promise.reject({
                                code: -1,
                                message: (_b = error.message) !== null && _b !== void 0 ? _b : "上传异常",
                                name: filename,
                            });
                        }
                    }
                }
                yield this.chain
                    .request({
                    url: "https://api.aliyundrive.com/v2/file/complete",
                    method: "POST",
                    data: Object.assign({ file_id: uploadInfo.file_id, upload_id: uploadInfo.upload_id }, request_params.data),
                })
                    .setHeaders(request_params.header)
                    .replay(1);
                loadeds = [stat.size];
                reportProgress();
                return {
                    code: 200,
                    name: filename,
                    message: "上传成功",
                };
            }
            catch (error) {
                if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 409) {
                    try {
                        delete data.pre_hash;
                        data = Object.assign(Object.assign({}, data), this.generateProofCode(filebuf, request_params.token));
                        yield this.chain
                            .request({
                            url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                            method: "POST",
                            data,
                        })
                            .send(request_params.data)
                            .setHeaders(request_params.header);
                        loadeds = [stat.size];
                        reportProgress();
                        return {
                            code: 200,
                            name: filename,
                            message: "上传成功",
                        };
                    }
                    catch (error) {
                        return {
                            code: -1,
                            name: filename,
                            message: error.message,
                        };
                    }
                }
                return {
                    code: -1,
                    name: filename,
                    message: error.message,
                };
            }
        });
    }
    upload(params, request_params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { source_path, parent_file_id = "root" } = params;
            let progress = {};
            const reportProgress = () => {
                if (!onProgress) {
                    return;
                }
                onProgress(progress);
            };
            const stat = fs_1.default.statSync(source_path);
            if (stat.isDirectory()) {
                const dirname = source_path.split(/\/|\\/).pop();
                const { items } = yield this.searchFile({
                    parent_file_id,
                    name: dirname,
                }, request_params).getData();
                let dir_id = "";
                if (items.length) {
                    dir_id = items.find((item) => item.name === dirname).file_id;
                }
                if (!dir_id) {
                    const dir = yield this.createDir({
                        parent_file_id: params.parent_file_id,
                        name: dirname,
                    }, request_params)
                        .replay(1)
                        .getData();
                    dir_id = dir.file_id;
                }
                const files = fs_1.default.readdirSync(source_path);
                const dirs = [];
                const tasks = [];
                for (const name of files) {
                    let isfile = false;
                    const filepath = path_1.default.join(source_path, name);
                    if (path_1.default.extname(name)) {
                        isfile = true;
                    }
                    if (!isfile) {
                        isfile = !fs_1.default.statSync(filepath).isDirectory();
                    }
                    if (!isfile) {
                        dirs.push(filepath);
                    }
                    else {
                        tasks.push(() => {
                            return this.uploadFile(Object.assign(Object.assign({}, params), { parent_file_id: dir_id, source_path: filepath }), request_params, (data) => {
                                progress[filepath] = data;
                                reportProgress();
                            });
                        });
                    }
                }
                for (const dir_path of dirs) {
                    tasks.push(() => {
                        return this.upload({
                            parent_file_id: dir_id,
                            source_path: dir_path,
                        }, request_params, (data) => {
                            progress = Object.assign(Object.assign({}, progress), data);
                            reportProgress();
                        });
                    });
                }
                yield limitConcurrency(tasks, params.concurrent || 1);
                return {
                    code: 0,
                    message: "上传完成",
                };
            }
            else {
                yield this.uploadFile(params, request_params, (data) => {
                    progress[params.source_path] = data;
                    reportProgress();
                });
                return {
                    code: 0,
                    message: "上传完成",
                };
            }
        });
    }
}
AliCloudApi.TIME_ONE_DAY = 86400000;
AliCloudApi.TIME_ONE_MINUTE = 60000;
AliCloudApi.DeviceRefere = "https://www.aliyundrive.com/";
AliCloudApi.WebRefere = "https://www.alipan.com/";
exports.default = AliCloudApi;
