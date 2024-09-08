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
exports.LocalCache = exports.Wrapper = void 0;
const core_1 = require("request_chain/core");
Object.defineProperty(exports, "Wrapper", { enumerable: true, get: function () { return core_1.Wrapper; } });
const node_1 = require("request_chain/node");
Object.defineProperty(exports, "LocalCache", { enumerable: true, get: function () { return node_1.LocalCache; } });
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
const os_1 = __importDefault(require("os"));
// windows
const headers = {
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "none",
    Origin: "https://www.alipan.com",
    Referer: "https://www.aliyundrive.com/",
    "x-canary": "client=windows,app=adrive,version=v6.3.1",
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
        this.chain = new core_1.RequestChain({
            timeout: 10000,
            request: options.request,
            localCache: options.localCache,
            headers,
        }, options.interceptor);
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
                app_id,
                refresh_token,
            },
        });
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
     * 默认缓存1天
     */
    getUserInfo(token) {
        return this.chain
            .request({
            url: "https://user.aliyundrive.com/v2/user/get",
            method: "POST",
            cache: "local",
            expires: AliCloudApi.TIME_ONE_DAY,
        })
            .setHeaders({
            Authorization: `Bearer ${token}`,
        });
    }
    /**
     * 获取文件目录
     */
    getDirs(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v3/file/list?jsonmask=next_marker%2Citems(name%2Cfile_id%2Cdrive_id%2Ctype%2Csize%2Ccreated_at%2Cupdated_at%2Ccategory%2Cfile_extension%2Cparent_file_id%2Cmime_type%2Cstarred%2Cthumbnail%2Curl%2Cstreams_info%2Ccontent_hash%2Cuser_tags%2Cuser_meta%2Ctrashed%2Cvideo_media_metadata%2Cvideo_preview_metadata%2Csync_meta%2Csync_device_flag%2Csync_flag%2Cpunish_flag%2Cfrom_share_id)",
            method: "POST",
            data: Object.assign(Object.assign({ parent_file_id: "root", limit: 20, all: false, url_expire_sec: 14400, image_thumbnail_process: "image/resize,w_256/format,avif", image_url_process: "image/resize,w_1920/format,avif", video_thumbnail_process: "video/snapshot,t_120000,f_jpg,m_lfit,w_256,ar_auto,m_fast", fields: "*", order_by: "updated_at", order_direction: "DESC" }, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 获取文件信息
     * @param drive_id
     * @param file_id
     * @returns
     */
    getFileInfo(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get",
            method: "POST",
            cache: "local",
            expires: AliCloudApi.TIME_ONE_MINUTE,
            data: Object.assign(Object.assign({}, params), { token: undefined, url_expire_sec: 14400, office_thumbnail_process: "image/resize,w_400/format,jpeg", image_thumbnail_process: "image/resize,w_400/format,jpeg", image_url_process: "image/resize,w_1920/format,jpeg", video_thumbnail_process: "video/snapshot,t_106000,f_jpg,ar_auto,m_fast,w_400" }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 通过路径获取文件信息
     * @param drive_id
     * @param file_path
     * @returns
     */
    getFileInfoByPath(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get_by_path",
            method: "POST",
            data: Object.assign(Object.assign({}, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 获取下载地址,默认缓存2分钟
     * @param drive_id
     * @param file_id   id
     * @returns
     */
    getDownloadUrl(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/file/get_download_url",
            method: "POST",
            cache: "local",
            expires: AliCloudApi.TIME_ONE_MINUTE * 2,
            data: Object.assign(Object.assign({}, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
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
    trashRecycleBin(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/recyclebin/trash",
            method: "POST",
            data: Object.assign(Object.assign({}, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 回收站还原
     */
    restoreRecycleBin(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/recyclebin/restore",
            method: "POST",
            data: Object.assign(Object.assign({}, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 回收站列表
     */
    getRecycleBins(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/v2/recyclebin/list",
            method: "POST",
            data: Object.assign(Object.assign({ fields: "*", all: false, limit: 50 }, params), { token: undefined }),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 彻底删除
     * @param drive_id
     * @param file_id
     * @returns
     */
    delete(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.chain
                .request({
                url: "https://api.aliyundrive.com/v3/file/delete",
                method: "POST",
                data: Object.assign(Object.assign({}, params), { permanently: true, token: undefined }),
            })
                .setHeaders({
                Authorization: `Bearer ${params.token}`,
            });
        });
    }
    /**
     * 搜索文件
     * @param params
     * @returns
     */
    searchFile(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v3/file/search",
            method: "POST",
            data: {
                limit: 100,
                order_by: "name ASC",
                drive_id: params.drive_id,
                query: `parent_file_id = "${params.parent_file_id || "root"}" and (name = "${params.name}")`,
            },
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 创建文件
     * @param params
     * @returns
     */
    createDir(params) {
        var _a;
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
            method: "POST",
            data: Object.assign({ check_name_mode: "refuse", parent_file_id: (_a = params.parent_file_id) !== null && _a !== void 0 ? _a : "root", type: "folder" }, params),
        })
            .setHeaders({
            Authorization: `Bearer ${params.token}`,
        });
    }
    /**
     * 检查创建路径文件
     * @param drive_id
     * @param cloud_path
     * @returns
     */
    checkCreateDirByPath(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let info;
            const { cloud_path, drive_id, token } = params;
            const names = cloud_path.split("/");
            if (names[0] === "root") {
                names.shift();
            }
            let existPosition = 0;
            for (let i = names.length; i > 0; i--) {
                try {
                    const dir_path = names.slice(0, i).join("/");
                    const result = yield this.getFileInfoByPath({
                        drive_id,
                        file_path: `/${dir_path}`,
                        token,
                    }).getData();
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
                        drive_id,
                        name: createnames[i],
                        parent_file_id: (info === null || info === void 0 ? void 0 : info.file_id) || "root",
                        token,
                    };
                    info = yield this.createDir(params).getData();
                }
            }
            return info;
        });
    }
    /**
     * 创建下载任务
     * @param params
     * @returns
     */
    downloadTask(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeRef = setInterval(() => {
                this.reportTask(Object.assign({ slice_num: 2 }, params));
            }, 5000);
            try {
                const { file, dir_path, temp_dir_path = path_1.default.join(os_1.default.tmpdir(), "yunpan"), } = params;
                const dir_name = (0, sanitize_filename_1.default)(file.name.split(".")[0]);
                fs_1.default.mkdirSync(path_1.default.join(temp_dir_path, dir_name), {
                    recursive: true,
                });
                fs_1.default.mkdirSync(params.dir_path, { recursive: true });
                const init_part_size = Math.min(file.size, 5242880);
                const part_size = params.part_size || 20 * 1024 * 1024;
                const parts = [
                    {
                        start: 0,
                        end: init_part_size - 1,
                        size: init_part_size,
                    },
                ];
                const len = Math.ceil(Math.max(file.size - init_part_size, 0) / part_size);
                let start = init_part_size;
                let end = 0;
                for (let i = 1; i <= len; i++) {
                    end = Math.min(start + part_size, file.size);
                    parts.push({
                        start,
                        end: end - 1,
                        size: end - start,
                    });
                    start = end;
                }
                let loaded = 0;
                let etag = "";
                const reportProgress = (loaded) => {
                    if (!params.onProgress) {
                        return;
                    }
                    params.onProgress({
                        loaded,
                        total: file.size,
                        progress: Math.round((loaded / file.size) * 100),
                    });
                };
                const tasks = [];
                if (!file.download_url) {
                    const response = yield this.getDownloadUrl({
                        drive_id: file.drive_id,
                        file_id: file.file_id,
                        token: params.token,
                    }).getData();
                    file.download_url = response.url;
                }
                for (let i = 0; i < parts.length; i++) {
                    tasks.push(() => __awaiter(this, void 0, void 0, function* () {
                        const part = parts[i];
                        const temp_path = path_1.default.join(temp_dir_path, dir_name, `${(0, sanitize_filename_1.default)(file.name)}.part${i}`);
                        const range = [part.start, part.end];
                        if (fs_1.default.existsSync(temp_path)) {
                            const stat = fs_1.default.statSync(temp_path);
                            if (stat.size === part.size) {
                                return;
                            }
                            range[0] = stat.size;
                        }
                        const stream = fs_1.default.createWriteStream(temp_path);
                        const response = yield this.chain.request({
                            url: file.download_url,
                            responseType: "stream",
                            method: "GET",
                            headers: {
                                Connection: "keep-alive",
                                Range: `bytes=${range[0]}-${range[1]}`,
                                "Accept-Encoding": "",
                                "If-Range": etag !== null && etag !== void 0 ? etag : undefined,
                            },
                            onDownloadProgress(progressEvent) {
                                // console.log(
                                //   `${file.name} ===> `,
                                //   `${progressEvent.loaded}/${progressEvent.total} ${
                                //     progressEvent.progress * 100
                                //   }`
                                // );
                                reportProgress(loaded + (progressEvent.loaded || 0));
                            },
                        });
                        etag = response.headers.etag;
                        response.data.on("data", (chunk) => {
                            stream.write(chunk);
                        });
                        yield new Promise((resolve, reject) => {
                            response.data.on("close", () => {
                                stream.close();
                                resolve(temp_path);
                            });
                            response.data.on("end", () => {
                                stream.end();
                                resolve(temp_path);
                            });
                            response.data.on("error", (error) => {
                                reject(error);
                            });
                        });
                        loaded += part.size;
                        reportProgress(loaded);
                    }));
                }
                reportProgress(loaded);
                yield tasks.shift()();
                yield limitConcurrency(tasks, params.concurrent || 2);
                reportProgress(file.size);
                yield this.reportTask(Object.assign({ slice_num: 0 }, params));
                yield new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(true);
                    }, 500);
                });
                const files = fs_1.default.readdirSync(path_1.default.join(temp_dir_path, dir_name));
                const file_parts = files.sort((a, b) => {
                    const numA = parseInt(a.match(/\.part(\d+)$/)[1], 10);
                    const numB = parseInt(b.match(/\.part(\d+)$/)[1], 10);
                    return numA - numB;
                });
                const outputStream = fs_1.default.createWriteStream(path_1.default.join(dir_path, file.name));
                for (const part of file_parts) {
                    const partPath = path_1.default.join(temp_dir_path, dir_name, part);
                    const data = fs_1.default.readFileSync(partPath);
                    outputStream.write(data);
                }
                outputStream.end();
                clearInterval(timeRef);
            }
            catch (error) {
                clearInterval(timeRef);
                return Promise.reject(error);
            }
        });
    }
    /**
     *  遍历获取目录文件树
     */
    traverseDirs(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const root = yield this.getFileInfo(params).getData();
            if (root.type === "folder") {
                const traverse = (parent_file_id) => __awaiter(this, void 0, void 0, function* () {
                    let next = "init";
                    let files = [];
                    while (next) {
                        const { items, next_marker } = yield this.getDirs({
                            drive_id: params.drive_id,
                            parent_file_id,
                            limit: 100,
                            marker: next === "init" ? undefined : next,
                            token: params.token,
                        })
                            .cache("local", 30000)
                            .getData();
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
    extractLinksFromDirs(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const tree = yield this.traverseDirs(params);
            let queque = [...tree.children];
            while (queque.length) {
                const file = queque.shift();
                if (file.type === "folder") {
                    queque = queque.concat(file.children);
                }
                else if (!file.download_url) {
                    const response = yield this.getDownloadUrl(Object.assign(Object.assign({}, params), { file_id: file.file_id })).getData();
                    file.download_url = response.url;
                }
            }
            return tree;
        });
    }
    /**
     * 大概和下载速度是否稳定有关系
     */
    reportTask(params) {
        return this.chain
            .request({
            url: "https://api.aliyundrive.com/adrive/v2/file/reportDownloadTask",
            method: "POST",
            data: {
                slice_num: params.slice_num,
            },
        })
            .setHeaders({
            "x-device-id": params.drive_id,
            Authorization: `Bearer ${params.token}`,
        });
    }
    download(params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { drive_id, file_id, token, part_size, concurrent, temp_path, check_name_mode = "refuse", } = params;
            let progress = {};
            const reportProgress = () => {
                if (!onProgress) {
                    return;
                }
                onProgress(progress);
            };
            const file_info = yield this.getFileInfo({
                drive_id,
                file_id,
                token,
            }).getData();
            const download = (file, save_dir_path) => __awaiter(this, void 0, void 0, function* () {
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
                yield this.downloadTask({
                    part_size,
                    concurrent,
                    dir_path: save_dir_path,
                    temp_dir_path: temp_path,
                    file,
                    token,
                    drive_id,
                    onProgress(data) {
                        progress[save_path] = {
                            progress: data.progress,
                            loaded: data.loaded,
                            total: data.total,
                            name: file.name,
                        };
                        reportProgress();
                    },
                });
                return {
                    code: 0,
                    message: "下载完成",
                };
            });
            const getDirChildren = (file) => __awaiter(this, void 0, void 0, function* () {
                let next = "init";
                let files = [];
                while (next) {
                    const { items, next_marker } = yield this.getDirs({
                        drive_id,
                        parent_file_id: file.file_id,
                        limit: 100,
                        marker: next === "init" ? undefined : next,
                        token,
                    })
                        .cache("local", 30000)
                        .getData();
                    next = next_marker;
                    files = files.concat(items);
                }
                return files;
            });
            const downloadDir = (file, dir_path) => __awaiter(this, void 0, void 0, function* () {
                const save_dir_path = path_1.default.join(dir_path, (0, sanitize_filename_1.default)(file.name));
                fs_1.default.mkdirSync(save_dir_path, { recursive: true });
                const children = yield getDirChildren(file);
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
    uploadFile(params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { source_path, drive_id, parent_file_id, token, check_name_mode } = params;
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
                drive_id,
                name: filename,
                parent_file_id,
                token,
            }).getData();
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
                drive_id,
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
                data = Object.assign(Object.assign({}, data), this.generateProofCode(filebuf, token));
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
                    .setHeaders({
                    Authorization: `Bearer ${token}`,
                })
                    .getData();
                if (uploadInfo.rapid_upload) {
                    loadeds = [stat.size];
                    reportProgress();
                    return {
                        code: 0,
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
                    data: {
                        drive_id,
                        file_id: uploadInfo.file_id,
                        upload_id: uploadInfo.upload_id,
                    },
                })
                    .setHeaders({
                    Authorization: `Bearer ${token}`,
                })
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
                        data = Object.assign(Object.assign({}, data), this.generateProofCode(filebuf, token));
                        yield this.chain
                            .request({
                            url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                            method: "POST",
                            data,
                        })
                            .setHeaders({
                            Authorization: `Bearer ${token}`,
                        });
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
    upload(params, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { source_path, parent_file_id = "root", drive_id, token } = params;
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
                    drive_id,
                    parent_file_id,
                    name: dirname,
                    token,
                }).getData();
                let dir_id = "";
                if (items.length) {
                    dir_id = items.find((item) => item.name === dirname).file_id;
                }
                if (!dir_id) {
                    const dir = yield this.createDir({
                        drive_id: params.drive_id,
                        parent_file_id: params.parent_file_id,
                        name: dirname,
                        token,
                    })
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
                            return this.uploadFile(Object.assign(Object.assign({}, params), { parent_file_id: dir_id, source_path: filepath }), (data) => {
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
                            drive_id,
                            token,
                        }, (data) => {
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
                yield this.uploadFile(params, (data) => {
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
AliCloudApi.TIME_ONE_DAY = 8640000;
AliCloudApi.TIME_ONE_MINUTE = 60000;
exports.default = AliCloudApi;
