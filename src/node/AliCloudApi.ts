import { RequestChain, Cache, RequestChainResponse } from "request_chain/core";
import { Downloader } from "request_chain/node";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";
import os from "os";
import elliptic from "elliptic";
import machine from "node-machine-id";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";
const EC = elliptic.ec;
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
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) aDrive/6.3.1 Chrome/112.0.5615.165 Electron/24.1.3.7 Safari/537.36",
};

/**
 * 限制并发任务数量
 * @param {Function[]} tasks - 任务函数数组，每个任务函数返回一个 Promise
 * @param {number} n - 最大并发数量
 * @returns {Promise<any[]>} - 所有任务完成后的结果数组
 */
async function limitConcurrency(tasks: Array<() => Promise<any>>, n = 2) {
  const results: any[] = [];
  let index = 0;
  const executeTask = async () => {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (e) {
        results[i] = e;
      }
    }
  };
  const workers = Array.from({ length: n }, executeTask);
  await Promise.all(workers);
  return results;
}

class AliCloudApi {
  public chain: RequestChain;
  private local_cache: Cache;
  private static readonly TIME_ONE_DAY = 86400000;
  private static readonly TIME_ONE_MINUTE = 60000;

  constructor(options: {
    request: RequestChain.RequestFn;
    localCache: Cache;
    interceptor?: RequestChain.InterceptorFn;
  }) {
    this.local_cache = options.localCache;

    this.chain = new RequestChain(
      {
        local: this.local_cache,
        request: options.request,
        interceptor: options.interceptor,
      },
      {
        timeout: 10000,
        headers,
      }
    );
  }

  /**
   * 随机的设备id
   * @returns
   */
  public generateRandomDeviceId() {
    // return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    //   /[xy]/g,
    //   function (e) {
    //     var t = (16 * Math.random()) | 0;
    //     return ("x" == e ? t : (3 & t) | 8).toString(16);
    //   }
    // );
    return uuidv4();
  }

  public static DeviceRefere = "https://www.aliyundrive.com/";
  public static WebRefere = "https://www.alipan.com/";

  /**
   * 根据设备标识 生成设备ID
   */
  public generateDeviceId() {
    const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const deviceInfo = `${platform}-${arch}-${hostname}-${machine.machineIdSync()}`;
    const uuid = uuidv5(deviceInfo, NAMESPACE);
    return uuid;
  }

  public x_signature(params: {
    privateKeyHex: string;
    app_id: string;
    x_device_id: string;
    user_id: string;
    nonce?: number;
  }) {
    const { app_id, x_device_id, user_id, nonce, privateKeyHex } = params;
    try {
      const message = `${app_id}:${x_device_id}:${user_id}:${nonce}`;
      const hash = crypto.createHash("sha256").update(message).digest("hex");
      const result = secp
        .keyFromPrivate(privateKeyHex, "hex")
        .sign(hash, { canonical: true });
      const recovery = result.recoveryParam;
      const [r, s] = [result.r.toString("hex"), result.s.toString("hex")];
      return `${r}${s}0${recovery}`;
    } catch (error) {
      return undefined;
    }
  }

  public async generatePrivateKeyHex(params: {
    token: string;
    app_id: string;
    x_device_id: string;
    user_id: string;
  }) {
    const keyPair = secp.genKeyPair();
    const privateKeyHex = keyPair.getPrivate("hex");
    const publicKeyHex = keyPair.getPublic("hex");

    await this.chain
      .post("https://api.aliyundrive.com/users/v1/users/device/create_session")
      .send({
        deviceName: os.hostname().toLocaleUpperCase() || "Edge浏览器",
        modelName: "Windows客户端",
        pubKey: publicKeyHex,
        user_id: params.user_id,
      })
      .setHeaders({
        Authorization: `Bearer ${params.token}`,
        "x-signature": this.x_signature({
          ...params,
          privateKeyHex,
        }),
        "x-device-id": params.x_device_id,
      });

    return { privateKeyHex, publicKeyHex };
  }

  public generateRequestParams(parmas: {
    token?: string;
    app_id: string;
    x_device_id: string;
    drive_id: string;
    user_id: string;
    privateKeyHex: string;
  }): AliCloudApi.RequestParams {
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

  public reportTask(
    slice_num: number,
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .post("https://api.aliyundrive.com/adrive/v2/file/reportDownloadTask")
      .send({ slice_num, ...request_params.data })
      .setHeaders(request_params.header)
      .cache("memory", 2000)
      .enableMergeSame();
  }

  /**
   * 获取云盘配置信息，如app_id、client_id
   * 默认缓存1天
   */
  public getConfig() {
    const promise = this.chain.request<AliCloudApi.AliConfig>({
      url: "https://www.alipan.com/drive/file/all",
      method: "GET",
      cache: "local",
      expires: AliCloudApi.TIME_ONE_DAY,
      mergeSame: true,
    });
    const getData = promise.getData.bind(promise);
    promise.getData = async () => {
      try {
        const response = await getData();
        const [text] = response
          .replace(/\n/g, "")
          .match(/var Global = \{(.+?)\}/i) ?? [""];
        const result = eval(text.replace("var ", "global."));
        return result as AliCloudApi.AliConfig;
      } catch (error) {
        return Promise.reject(error);
      }
    };
    return promise;
  }

  /**
   * 获取扫码登录的扫码链接、ck、t，需要生成二维码
   * 默认缓存10分钟
   */
  public getLoginQrCodeUrl() {
    return this.chain.request<AliCloudApi.LoginQrCode>({
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
  public queryQrCodeStatus(params: { ck: string; t: number }) {
    const data = {
      appName: "aliyun_drive",
      appEntrance: "web_default",
      fromSite: 52,
      navPlatform: "Win32",
      isIframe: true,
      documentReferer: "https://auth.alipan.com/",
      defaultView: "qrcode",
      ...params,
    };
    return this.chain
      .request<AliCloudApi.LoginQrCodeStatus>({
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
  public refreshToken(app_id: string, refresh_token: string) {
    return this.chain.request<AliCloudApi.TokenInfo>({
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

  public logout(request_params: AliCloudApi.RequestParams) {
    return this.chain
      .post("https://api.aliyundrive.com/users/v1/users/device_logout")
      .send(request_params.data)
      .setHeaders(request_params.header);
  }

  /**
   * 二维码登录
   */
  public async qrLogin(
    listener: (data: {
      msg: string;
      status:
        | "init"
        | "qr"
        | "check"
        | "expired"
        | "canceled"
        | "scaned"
        | "confirmed";
      data?: any;
    }) => void | Promise<void>
  ) {
    await listener({ msg: "获取登录连接", status: "init" });
    const QrResponse = await this.getLoginQrCodeUrl();
    const { ck, codeContent, t } = QrResponse.data.content.data;

    await listener({ msg: "生成二维码", status: "qr", data: codeContent });

    await listener({ msg: "检查扫码状态", status: "check" });

    return new Promise<AliCloudApi.LoginInfo>((resolve, reject) => {
      const checkStatus = async () => {
        const CheckResponse = await this.queryQrCodeStatus({
          ck,
          t,
        });

        const { qrCodeStatus, bizExt } = CheckResponse.data.content.data;
        if (["EXPIRED"].includes(qrCodeStatus)) {
          await listener({ msg: "登录过期", status: "expired" });
          reject(Error("登录过期"));
          return;
        }
        if (["CANCELED"].includes(qrCodeStatus)) {
          await listener({ msg: "用户取消登录", status: "canceled" });
          reject(Error("用户取消登录"));
          return;
        }
        if (["SCANED"].includes(qrCodeStatus)) {
          await listener({
            msg: "扫码成功，待确认登录",
            status: "scaned",
          });
        }
        if (["CONFIRMED"].includes(qrCodeStatus)) {
          const info = JSON.parse(
            Buffer.from(bizExt, "base64").toString("utf-8")
          );
          await listener({ msg: "登陆成功", status: "confirmed" });
          resolve(info.pds_login_result);
          return;
        }
        setTimeout(() => {
          checkStatus();
        }, 2000);
      };
      checkStatus();
    });
  }

  /**
   * 获取个人信息和 drive_id = resource_drive_id
   */
  public getUserInfo(token: string) {
    return this.chain
      .request<AliCloudApi.UserInfo>({
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
  public getDirs(
    params: {
      limit?: number;
      all?: boolean;
      parent_file_id?: string;
      order_direction?: "DESC" | "ASC";
      /**
       * 下一页  next_marker
       */
      marker?: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .post<{
        next_marker: string;
        items: AliCloudApi.FileDirItem[];
      }>(
        "https://api.aliyundrive.com/adrive/v3/file/list?jsonmask=next_marker%2Citems(name%2Cfile_id%2Cdrive_id%2Ctype%2Csize%2Ccreated_at%2Cupdated_at%2Ccategory%2Cfile_extension%2Cparent_file_id%2Cmime_type%2Cstarred%2Cthumbnail%2Curl%2Cstreams_info%2Ccontent_hash%2Cuser_tags%2Cuser_meta%2Ctrashed%2Cvideo_media_metadata%2Cvideo_preview_metadata%2Csync_meta%2Csync_device_flag%2Csync_flag%2Cpunish_flag%2Cfrom_share_id)"
      )
      .send({
        parent_file_id: "root",
        limit: 20,
        all: false,
        url_expire_sec: 14400,
        image_thumbnail_process: "image/resize,w_400/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpegjpeg",
        video_thumbnail_process:
          "video/snapshot,t_120000,f_jpg,m_lfit,w_400,ar_auto,m_fast",
        fields: "*",
        order_by: "updated_at",
        order_direction: "DESC",
        ...params,
        ...request_params.data,
      })
      .setHeaders(request_params.header);
  }

  /**
   * 获取文件信息
   * @param file_id
   * @returns
   */
  public getFileInfo(
    file_id: string,
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<AliCloudApi.FileDirItem>({
        url: "https://api.aliyundrive.com/v2/file/get",
        method: "POST",
        data: {
          file_id,
          url_expire_sec: 14400,
          office_thumbnail_process: "image/resize,w_400/format,jpeg",
          image_thumbnail_process: "image/resize,w_400/format,jpeg",
          image_url_process: "image/resize,w_1920/format,jpeg",
          video_thumbnail_process:
            "video/snapshot,t_106000,f_jpg,ar_auto,m_fast,w_400",
          ...request_params.data,
        },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 通过路径获取文件信息
   * @param file_path
   * @returns
   */
  public getFileInfoByPath(
    file_path: string,
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<AliCloudApi.FileDirItem>({
        url: "https://api.aliyundrive.com/v2/file/get_by_path",
        method: "POST",
        data: { file_path, ...request_params.data },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 获取下载地址,默认4小时
   * 返回 header 里面的 access-control-allow-origin  在下载时的 Referer进行设置
   * @param file_id   id
   * @returns
   */
  public getDownloadUrl(
    params: {
      file_id: string;
      os?:
        | "web"
        | "Mac"
        | "Windows"
        | "iOS"
        | "Android"
        | "Browser"
        | "Unknown";
    },
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<AliCloudApi.DownloadDetail>({
        url: "https://api.aliyundrive.com/v2/file/get_download_url",
        method: "POST",
        cache: "local",
        expires: 14400000,
        data: {
          ...params,
          ...request_params.data,
          expire_sec: 14400,
          os: undefined,
        },
      })
      .setHeaders({
        ...request_params.header,
        "x-canary": `client=${params.os || "web"},app=adrive,version=v6.4.2`,
      });
  }

  public generateProofCode(buf: Buffer, token: string) {
    const buffa = Buffer.from(token);
    const md5a = crypto.createHash("md5").update(buffa).digest("hex");
    const start = Number(
      BigInt("0x" + md5a.substring(0, 16)) % BigInt(buf.byteLength)
    );
    const end = Math.min(start + 8, buf.byteLength);
    const buffb = buf.subarray(start, end);
    const proof_code = buffb.toString("base64");
    const content_hash_name = "sha1";
    const content_hash = crypto
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

  public generatePreHash(buf: Buffer) {
    const pre_hash = crypto
      .createHash("sha1")
      .update(buf.subarray(0, 1024))
      .digest("hex")
      .toLocaleLowerCase();
    return { pre_hash };
  }

  /**
   * 扔进回收站
   */
  public trashRecycleBin(
    file_ids: Array<string>,
    request_params: AliCloudApi.RequestParams
  ) {
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
    } else {
      return this.chain
        .request({
          url: "https://api.aliyundrive.com/v2/recyclebin/trash",
          method: "POST",
          data: { file_id: file_ids[0], ...request_params.data },
        })
        .setHeaders(request_params.header);
    }
  }

  /**
   * 回收站还原
   */
  public restoreRecycleBin(
    file_id: string,
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request({
        url: "https://api.aliyundrive.com/v2/recyclebin/restore",
        method: "POST",
        data: { file_id, ...request_params.data },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 回收站列表
   */
  public getRecycleBins(
    params: {
      limit?: number;
      all?: boolean;
      marker?: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<{
        items: AliCloudApi.FileDirItem[];
        next_marker: string;
      }>({
        url: "https://api.aliyundrive.com/v2/recyclebin/list",
        method: "POST",
        data: {
          fields: "*",
          all: false,
          limit: 50,
          ...params,
          ...request_params.data,
        },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 彻底删除
   * @param file_id
   * @returns
   */
  public delete(
    file_ids: Array<string>,
    request_params: AliCloudApi.RequestParams
  ) {
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
    } else {
      return this.chain
        .request({
          url: "https://api.aliyundrive.com/v3/file/delete",
          method: "POST",
          data: {
            ...request_params.data,
            file_id: file_ids[0],
            permanently: true,
          },
        })
        .setHeaders(request_params.header);
    }
  }

  /**
   * 搜索文件
   * @param params
   * @returns
   */
  public searchFile(
    params: {
      parent_file_id?: string;
      name: string;
      marker?: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<{
        items: AliCloudApi.FileDirItem[];
        next_marker: string;
      }>({
        url: "https://api.aliyundrive.com/adrive/v3/file/search",
        method: "POST",
        data: {
          limit: 100,
          order_by: "name ASC",
          query: `parent_file_id = "${
            params.parent_file_id || "root"
          }" and (name = "${params.name}")`,
          marker: params.marker,
          ...request_params.data,
        },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 创建文件
   * @param params
   * @returns
   */
  public createDir(
    params: {
      parent_file_id?: string;
      name: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    return this.chain
      .request<AliCloudApi.DirInfo>({
        url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
        method: "POST",
        data: {
          check_name_mode: "refuse",
          parent_file_id: params.parent_file_id ?? "root",
          type: "folder",
          ...params,
          ...request_params.data,
        },
      })
      .setHeaders(request_params.header);
  }

  /**
   * 检查创建路径文件
   * @param cloud_path
   * @returns
   */
  public async checkCreateDirByPath(
    cloud_path: string,
    request_params: AliCloudApi.RequestParams
  ) {
    let info: AliCloudApi.DirInfo;
    const names = cloud_path.split("/");
    if (names[0] === "root") {
      names.shift();
    }
    let existPosition = 0;
    for (let i = names.length; i > 0; i--) {
      try {
        const dir_path = names.slice(0, i).join("/");

        const result = await this.getFileInfoByPath(
          `/${dir_path}`,
          request_params
        ).getData();

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
      } catch (error) {
        continue;
      }
    }

    if (existPosition <= names.length - 1) {
      const createnames = names.slice(existPosition);
      for (let i = 0; i < createnames.length; i++) {
        const params = {
          name: createnames[i],
          parent_file_id: info?.file_id || "root",
        };
        info = await this.createDir(params, request_params).getData();
      }
    }

    return info;
  }

  public async downloadTask(
    params: {
      file: {
        download_url?: string;
        file_id: string;
        size: number;
        name: string;
      };
      part_size?: number;
      temp_dir_path?: string;
      referer?: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    const { file, temp_dir_path = path.join(os.tmpdir(), "yunpan") } = params;

    if (!file.download_url) {
      const response = await this.getDownloadUrl(
        {
          file_id: file.file_id,
          os: file.size > 100 * 1024 * 1024 ? "Windows" : "web",
          // os: "Windows",
        },
        request_params
      );
      if (!params.referer) {
        params.referer = response.headers["access-control-allow-origin"];
      }
      file.download_url = response.data.url;
    }

    const downloader = new Downloader({
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
      headers: {
        ...headers,
        Connection: "keep-alive",
        "Accept-Encoding": "",
        "x-canary": undefined,
        referer: params.referer || headers.Referer,
      },
    });

    const download = downloader.download.bind(downloader);

    downloader.download = async (concurrent = 2) => {
      const stream = await downloader.startPart(0, {
        preloaded: 5 * 1024 * 1024,
        useCache: true,
      });
      await downloader.waitPartStream(stream);
      return download(concurrent);
    };

    return downloader;
  }

  /**
   *  遍历获取目录文件树
   */
  public async traverseDirs(
    file_id: string,
    request_params: AliCloudApi.RequestParams
  ): Promise<AliCloudApi.FileDirTree> {
    const root = await this.getFileInfo(file_id, request_params).getData();
    if (root.type === "folder") {
      const traverse = async (parent_file_id: string) => {
        let next = "init";
        let files: AliCloudApi.FileDirTree[] = [];
        while (next) {
          const { items, next_marker } = await this.getDirs(
            {
              parent_file_id,
              limit: 100,
              marker: next === "init" ? undefined : next,
            },
            request_params
          ).getData();
          next = next_marker;
          files = files.concat(items);
        }
        for (const file of files) {
          if (file.type === "folder") {
            file.children = await traverse(file.file_id);
          }
        }
        return files;
      };

      const children = await traverse(root.file_id);
      return {
        ...root,
        children,
      };
    } else {
      return root;
    }
  }

  /**
   * 获取具有下载地址的文件树
   */
  public async extractLinksFromDirs(
    params: {
      file_id: string;
      os?:
        | "web"
        | "Mac"
        | "Windows"
        | "iOS"
        | "Android"
        | "Browser"
        | "Unknown";
    },

    request_params: AliCloudApi.RequestParams
  ) {
    const tree = await this.traverseDirs(params.file_id, request_params);

    let queque = [...tree.children];

    while (queque.length) {
      const file = queque.shift();
      if (file.type === "folder") {
        queque = queque.concat(file.children);
      } else if (!file.download_url) {
        const response = await this.getDownloadUrl(
          { file_id: file.file_id, os: params.os },
          request_params
        ).getData();
        file.download_url = response.url;
      }
    }

    return tree;
  }

  private time_ref: any;

  public async download(
    params: {
      file_id: string;
      save_dir_path: string;
      check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
      part_size?: number;
      temp_path?: string;
      concurrent?: number;
    },
    request_params: AliCloudApi.RequestParams,
    onProgress?: (
      data: Record<
        string,
        {
          progress: number;
          total: number;
          loaded: number;
          name: string;
        }
      >
    ) => void
  ) {
    const {
      file_id,
      part_size,
      temp_path,
      check_name_mode = "refuse",
    } = params;

    let progress: Record<
      string,
      {
        progress: number;
        total: number;
        loaded: number;
        name: string;
      }
    > = {};

    const reportProgress = () => {
      if (!onProgress) {
        return;
      }
      onProgress(progress);
    };

    const file_info = await this.getFileInfo(file_id, request_params).getData();

    const download = async (
      file: AliCloudApi.FileDirItem,
      save_dir_path: string
    ) => {
      try {
        let save_path = path.join(save_dir_path, sanitize(file.name));

        if (fs.existsSync(save_path)) {
          const stat = fs.statSync(save_path);
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
            const buf = fs.readFileSync(save_path);
            const md5 = crypto
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
            const ext = path.extname(file_info.name);
            save_path = save_path.replace(ext, "") + `_${Date.now()}${ext}`;
          }
        }

        const downloader = await this.downloadTask(
          {
            part_size,
            temp_dir_path: temp_path,
            file,
          },
          request_params
        );

        downloader.onProgress((file) => {
          progress[save_path] = file;
          reportProgress();
        });

        clearInterval(this.time_ref);

        this.time_ref = setInterval(() => {
          this.reportTask(2, request_params);
        }, 4000);

        await this.reportTask(0, request_params);

        await downloader.download(params.concurrent || 2);

        await downloader.save(save_dir_path);

        await downloader.deleteDownloadTemp();

        clearInterval(this.time_ref);

        await this.reportTask(0, request_params);

        return {
          code: 0,
          message: "下载完成",
        };
      } catch (error) {
        return Promise.reject(error);
      }
    };

    const getDirChildren = async (
      file: AliCloudApi.FileDirItem,
      request_params: AliCloudApi.RequestParams
    ) => {
      let next = "init";
      let files: AliCloudApi.FileDirItem[] = [];
      while (next) {
        const { items, next_marker } = await this.getDirs(
          {
            parent_file_id: file.file_id,
            limit: 100,
            marker: next === "init" ? undefined : next,
          },
          request_params
        ).getData();
        next = next_marker;
        files = files.concat(items);
      }
      return files;
    };

    const downloadDir = async (
      file: AliCloudApi.FileDirItem,
      dir_path: string
    ) => {
      const save_dir_path = path.join(dir_path, sanitize(file.name));
      fs.mkdirSync(save_dir_path, { recursive: true });

      const children = await getDirChildren(file, request_params);

      const dirs: AliCloudApi.FileDirItem[] = [];
      const files: AliCloudApi.FileDirItem[] = [];

      for (const file of children) {
        if (file.type === "folder") {
          dirs.push(file);
        } else {
          files.push(file);
        }
      }

      for (const file of files) {
        await download(file, save_dir_path);
      }

      for (const file of dirs) {
        await downloadDir(file, save_dir_path);
      }

      return {
        code: 0,
        message: "下载完成",
      };
    };

    if (file_info.type === "folder") {
      return downloadDir(file_info, params.save_dir_path);
    } else {
      const save_path = path.join(
        params.save_dir_path,
        sanitize(file_info.name)
      );
      return download(file_info, save_path);
    }
  }

  public uploadTask(
    params: {
      start_index?: number;
      source_path: string;
      parent_file_id?: string;
    },
    request_params: AliCloudApi.RequestParams
  ) {
    const { source_path, parent_file_id } = params;

    if (!fs.existsSync(source_path)) {
      return Promise.reject("资源文件不存在");
    }

    const stat = fs.statSync(source_path);
    const filename = sanitize(source_path.split(/\/|\\/).pop());

    const part_info_list: Array<{
      part_number: number;
      part_size: number;
    }> = [];

    const sourceBuffer = fs.readFileSync(source_path);

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

    let data: Record<string, any> = {
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
      data = {
        ...data,
        ...this.generatePreHash(sourceBuffer),
      };
    } else {
      data = {
        ...data,
        ...this.generateProofCode(sourceBuffer, request_params.token),
      };
    }

    let upload_index = params.start_index || 0;

    let status: "pending" | "wait" | "done" | "stop" = "wait";

    const progress_events: Array<
      (
        data: {
          loaded: number;
          total: number;
          progress: number;
          name: string;
        },
        part: {
          current: number;
          total: number;
        }
      ) => void
    > = [];

    const status_events: Array<
      (
        status: "pending" | "wait" | "done" | "stop",
        part: {
          current: number;
          total: number;
        }
      ) => void
    > = [];

    const onProgress = (
      fn: (
        data: {
          loaded: number;
          total: number;
          progress: number;
          name: string;
        },
        part: {
          current: number;
          total: number;
        }
      ) => void
    ) => {
      progress_events.push(fn);
      notifyProgress(
        Math.min(upload_index * chunk_size, sourceBuffer.byteLength)
      );
      return () => {
        const index = progress_events.indexOf(fn);
        index >= 0 && progress_events.splice(index, 1);
      };
    };

    const notifyProgress = (loaded: number) => {
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

    const onStatus = (
      fn: (
        status: "pending" | "wait" | "done" | "stop",
        part: {
          current: number;
          total: number;
        }
      ) => void
    ) => {
      status_events.push(fn);
      notifyStatus(status);
      return () => {
        const index = status_events.indexOf(fn);
        index >= 0 && status_events.splice(index, 1);
      };
    };

    const notifyStatus = (value: "pending" | "wait" | "done" | "stop") => {
      status = value;
      status_events.forEach((fn) => {
        fn(status, {
          current: upload_index,
          total: part_info_list.length,
        });
      });
    };

    const noop = () => {};

    const callbaks: [
      (value: {
        file_id: string;
        name: string;
        parent_file_id: string;
        size: number;
        content_hash: string;
      }) => void,
      (reason?: any) => void,
      (stauts: "wait" | "stop") => void
    ] = [noop, noop, noop];

    const promise = new Promise<{
      file_id: string;
      name: string;
      parent_file_id: string;
      size: number;
      content_hash: string;
    }>((resolve, reject) => {
      callbaks[0] = resolve;
      callbaks[1] = reject;
    });

    const upload = () => {
      if (status === "wait") {
        const [resolve, reject] = callbaks;

        const done = (result: any) => {
          notifyStatus("done");
          notifyProgress(stat.size);
          resolve({
            name: filename,
            size: stat.size,
            content_hash: data.content_hash,
            ...result,
          });
        };

        const stop = (error: Error) => {
          notifyStatus("stop");
          notifyProgress(
            Math.min(upload_index * chunk_size, sourceBuffer.length)
          );
          reject(error);
        };

        const pause = () => {
          notifyStatus("wait");
          notifyProgress(
            Math.min(upload_index * chunk_size, sourceBuffer.length)
          );
        };

        notifyStatus("pending");

        const run = async () => {
          try {
            const uploadInfo = await this.chain
              .request<AliCloudApi.UploadDetail>({
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
              const end = Math.min(
                sourceBuffer.byteLength,
                (upload_index + 1) * chunk_size
              );
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
                callbaks[2] = (value: "wait" | "stop") => {
                  req.abort(value);
                };
                await req;
                upload_index++;
                notifyProgress(upload_index * chunk.length);
                console.log(params.source_path, "end", upload_index);
              } catch (error) {
                if (error?.response?.status === 409) {
                  upload_index++;
                  notifyProgress(upload_index * chunk.length);
                } else if (error.message === "wait") {
                  pause();
                  return;
                } else {
                  stop(error);
                  return;
                }
              }
            }

            const result = await this.chain
              .request({
                url: "https://api.aliyundrive.com/v2/file/complete",
                method: "POST",
                data: {
                  file_id: uploadInfo.file_id,
                  upload_id: uploadInfo.upload_id,
                  ...request_params.data,
                },
              })
              .setHeaders(request_params.header)
              .replay(1)
              .getData();

            done(result);
          } catch (error) {
            if (error?.response?.status === 409) {
              try {
                delete data.pre_hash;
                data = {
                  ...data,
                  ...this.generateProofCode(sourceBuffer, request_params.token),
                };
                const uploadInfo = await this.chain
                  .request<AliCloudApi.UploadDetail>({
                    url: "https://api.aliyundrive.com/adrive/v2/file/createWithFolders",
                    method: "POST",
                    data,
                  })
                  .send(request_params.data)
                  .setHeaders(request_params.header)
                  .getData();
                done(uploadInfo);
              } catch (error) {
                stop(error);
                return;
              }
            } else {
              stop(error);
              return;
            }
          }
        };

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

  public async uploadFile(
    params: {
      source_path: string;
      parent_file_id?: string;
      check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
    },
    request_params: AliCloudApi.RequestParams,
    onProgress?: (data: {
      loaded: number;
      total: number;
      progress: number;
      name: string;
    }) => void
  ) {
    const { source_path, parent_file_id, check_name_mode } = params;

    let loadeds: Array<number> = [];

    const stat = fs.statSync(source_path);

    const filename = sanitize(source_path.split(/\/|\\/).pop());

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

    const { items } = await this.searchFile(
      {
        name: filename,
        parent_file_id,
      },
      request_params
    ).getData();

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

    const filebuf = fs.readFileSync(source_path);

    const part_info_list: Array<{
      part_number: number;
      part_size?: number;
    }> = [];

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

    let data: Record<string, any> = {
      part_info_list,
      parent_file_id,
      name: filename,
      type: "file",
      check_name_mode:
        check_name_mode === "compare" ? "overwrite" : check_name_mode,
      size: filebuf.byteLength,
      create_scene: "file_upload",
      device_name: "",
    };

    if (filebuf.byteLength >= 1024000) {
      data = {
        ...data,
        ...this.generatePreHash(filebuf),
      };
    } else {
      data = {
        ...data,
        ...this.generateProofCode(filebuf, request_params.token),
      };
    }

    if (check_name_mode === "compare" && cloud_file) {
      let content_hash = data.content_hash;
      if (!content_hash) {
        content_hash = crypto
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
      const uploadInfo = await this.chain
        .request<AliCloudApi.UploadDetail>({
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
          await this.chain.request({
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
        } catch (error) {
          if (error?.response?.status === 409) {
            loadeds[index] = chunk.byteLength;
            reportProgress();
          } else {
            return Promise.reject({
              code: -1,
              message: error.message ?? "上传异常",
              name: filename,
            });
          }
        }
      }

      await this.chain
        .request({
          url: "https://api.aliyundrive.com/v2/file/complete",
          method: "POST",
          data: {
            file_id: uploadInfo.file_id,
            upload_id: uploadInfo.upload_id,
            ...request_params.data,
          },
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
    } catch (error) {
      if (error?.response?.status === 409) {
        try {
          delete data.pre_hash;
          data = {
            ...data,
            ...this.generateProofCode(filebuf, request_params.token),
          };
          await this.chain
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
        } catch (error) {
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
  }

  public async upload(
    params: {
      /**
       * 具体文件或者目录
       */
      source_path: string;
      parent_file_id?: string;
      check_name_mode?: "auto_rename" | "overwrite" | "refuse" | "compare";
      concurrent?: number;
    },
    request_params: AliCloudApi.RequestParams,
    onProgress?: (
      data: Record<
        string,
        {
          progress: number;
          total: number;
          loaded: number;
          name: string;
        }
      >
    ) => void
  ) {
    const { source_path, parent_file_id = "root" } = params;

    let progress: Record<
      string,
      {
        progress: number;
        total: number;
        loaded: number;
        name: string;
      }
    > = {};

    const reportProgress = () => {
      if (!onProgress) {
        return;
      }
      onProgress(progress);
    };

    const stat = fs.statSync(source_path);

    if (stat.isDirectory()) {
      const dirname = source_path.split(/\/|\\/).pop();
      const { items } = await this.searchFile(
        {
          parent_file_id,
          name: dirname,
        },
        request_params
      ).getData();

      let dir_id = "";

      if (items.length) {
        dir_id = items.find((item) => item.name === dirname).file_id;
      }

      if (!dir_id) {
        const dir = await this.createDir(
          {
            parent_file_id: params.parent_file_id,
            name: dirname,
          },
          request_params
        )
          .replay(1)
          .getData();
        dir_id = dir.file_id;
      }

      const files = fs.readdirSync(source_path);
      const dirs: string[] = [];

      const tasks: Array<() => Promise<any>> = [];

      for (const name of files) {
        let isfile = false;

        const filepath = path.join(source_path, name);

        if (path.extname(name)) {
          isfile = true;
        }

        if (!isfile) {
          isfile = !fs.statSync(filepath).isDirectory();
        }

        if (!isfile) {
          dirs.push(filepath);
        } else {
          tasks.push(() => {
            return this.uploadFile(
              {
                ...params,
                parent_file_id: dir_id,
                source_path: filepath,
              },
              request_params,
              (data) => {
                progress[filepath] = data;
                reportProgress();
              }
            );
          });
        }
      }

      for (const dir_path of dirs) {
        tasks.push(() => {
          return this.upload(
            {
              parent_file_id: dir_id,
              source_path: dir_path,
            },
            request_params,
            (data) => {
              progress = {
                ...progress,
                ...data,
              };
              reportProgress();
            }
          );
        });
      }

      await limitConcurrency(tasks, params.concurrent || 1);

      return {
        code: 0,
        message: "上传完成",
      };
    } else {
      await this.uploadFile(params, request_params, (data) => {
        progress[params.source_path] = data;
        reportProgress();
      });
      return {
        code: 0,
        message: "上传完成",
      };
    }
  }
}

namespace AliCloudApi {
  export interface RequestParams {
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

  export interface LoginInfo {
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
    existLink: any[]; // Assuming this can be any array type
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

  export interface AliConfig {
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

  export interface LoginQrCode {
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

  export interface LoginQrCodeStatus {
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

  export interface UserInfo {
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

  export interface TokenInfo {
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
    exist_link: any[]; // This should be refined if possible
    state: string;
    expires_in: number;
    status: string;
  }

  export interface FileDirItem {
    created_at: string; // ISO 8601 date string
    drive_id: string;
    file_id: string;
    name: string;
    parent_file_id: string;
    starred: boolean;
    sync_device_flag: boolean;
    sync_flag: boolean;
    sync_meta: string;
    type: "file" | "folder";
    updated_at: string; // ISO 8601 date string
    url: string;
    download_url?: string;
    user_meta: string; // JSON string
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

  export interface DownloadDetail {
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

  export interface DirInfo {
    domain_id: string;
    drive_id: string;
    encrypt_mode: string;
    file_id: string;
    file_name: string;
    parent_file_id: string;
    type: string;
  }

  export interface UploadDetail {
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

  export interface FileDirTree extends FileDirItem {
    children?: FileDirTree[];
  }
}

export default AliCloudApi;
