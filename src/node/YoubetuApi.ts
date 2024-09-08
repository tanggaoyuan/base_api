import { Wrapper, RequestChain, Cache } from "request_chain/core";
import { LocalCache } from "request_chain/node";
import crypto from "crypto";
import { parse } from "node-html-parser";
import { savefrom } from "@bochilteam/scraper-savefrom";
import { PassThrough } from "stream";
import m3u8stream from "m3u8stream";

const FORMATS = {
  5: {
    mimeType: 'video/flv; codecs="Sorenson H.283, mp3"',
    qualityLabel: "240p",
    bitrate: 250000,
    audioBitrate: 64,
    height: 240,
  },
  6: {
    mimeType: 'video/flv; codecs="Sorenson H.263, mp3"',
    qualityLabel: "270p",
    bitrate: 800000,
    audioBitrate: 64,
    height: 270,
  },

  13: {
    mimeType: 'video/3gp; codecs="MPEG-4 Visual, aac"',
    qualityLabel: null,
    bitrate: 500000,
    audioBitrate: null,
  },

  17: {
    mimeType: 'video/3gp; codecs="MPEG-4 Visual, aac"',
    qualityLabel: "144p",
    bitrate: 50000,
    audioBitrate: 24,
    height: 144,
  },

  18: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: 96,
    height: 360,
  },

  22: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 2000000,
    audioBitrate: 192,
    height: 720,
  },

  34: {
    mimeType: 'video/flv; codecs="H.264, aac"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: 128,
    height: 360,
  },

  35: {
    mimeType: 'video/flv; codecs="H.264, aac"',
    qualityLabel: "480p",
    bitrate: 800000,
    audioBitrate: 128,
    height: 480,
  },

  36: {
    mimeType: 'video/3gp; codecs="MPEG-4 Visual, aac"',
    qualityLabel: "240p",
    bitrate: 175000,
    audioBitrate: 32,
    height: 240,
  },

  37: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "1080p",
    bitrate: 3000000,
    audioBitrate: 192,
    height: 1080,
  },

  38: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "3072p",
    bitrate: 3500000,
    audioBitrate: 192,
    height: 3072,
  },

  43: {
    mimeType: 'video/webm; codecs="VP8, vorbis"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: 128,
    height: 360,
  },

  44: {
    mimeType: 'video/webm; codecs="VP8, vorbis"',
    qualityLabel: "480p",
    bitrate: 1000000,
    audioBitrate: 128,
    height: 480,
  },

  45: {
    mimeType: 'video/webm; codecs="VP8, vorbis"',
    qualityLabel: "720p",
    bitrate: 2000000,
    audioBitrate: 192,
    height: 720,
  },

  46: {
    mimeType: 'audio/webm; codecs="vp8, vorbis"',
    qualityLabel: "1080p",
    bitrate: null,
    audioBitrate: 192,
  },

  82: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: 96,
    height: 360,
  },

  83: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "240p",
    bitrate: 500000,
    audioBitrate: 96,
    height: 240,
  },

  84: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 2000000,
    audioBitrate: 192,
    height: 720,
  },

  85: {
    mimeType: 'video/mp4; codecs="H.264, aac"',
    qualityLabel: "1080p",
    bitrate: 3000000,
    audioBitrate: 192,
    height: 1080,
  },

  91: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "144p",
    bitrate: 100000,
    audioBitrate: 48,
    height: 144,
  },

  92: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "240p",
    bitrate: 150000,
    audioBitrate: 48,
    height: 240,
  },

  93: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: 128,
    height: 360,
  },

  94: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "480p",
    bitrate: 800000,
    audioBitrate: 128,
    height: 480,
  },

  95: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 1500000,
    audioBitrate: 256,
    height: 720,
  },

  96: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "1080p",
    bitrate: 2500000,
    audioBitrate: 256,
    height: 1080,
  },

  100: {
    mimeType: 'audio/webm; codecs="VP8, vorbis"',
    qualityLabel: "360p",
    bitrate: null,
    audioBitrate: 128,
  },

  101: {
    mimeType: 'audio/webm; codecs="VP8, vorbis"',
    qualityLabel: "360p",
    bitrate: null,
    audioBitrate: 192,
  },

  102: {
    mimeType: 'audio/webm; codecs="VP8, vorbis"',
    qualityLabel: "720p",
    bitrate: null,
    audioBitrate: 192,
  },

  120: {
    mimeType: 'video/flv; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 2000000,
    audioBitrate: 128,
    height: 720,
  },

  127: {
    mimeType: 'audio/ts; codecs="aac"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 96,
  },

  128: {
    mimeType: 'audio/ts; codecs="aac"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 96,
  },

  132: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "240p",
    bitrate: 150000,
    audioBitrate: 48,
    height: 240,
  },

  133: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "240p",
    bitrate: 200000,
    audioBitrate: null,
    height: 240,
  },

  134: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "360p",
    bitrate: 300000,
    audioBitrate: null,
    height: 360,
  },

  135: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "480p",
    bitrate: 500000,
    audioBitrate: null,
    height: 480,
  },

  136: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "720p",
    bitrate: 1000000,
    audioBitrate: null,
    height: 720,
  },

  137: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "1080p",
    bitrate: 2500000,
    audioBitrate: null,
    height: 1080,
  },

  138: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "4320p",
    bitrate: 13500000,
    audioBitrate: null,
    height: 4320,
  },

  139: {
    mimeType: 'audio/mp4; codecs="aac"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 48,
  },

  140: {
    mimeType: 'audio/m4a; codecs="aac"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 128,
  },

  141: {
    mimeType: 'audio/mp4; codecs="aac"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 256,
  },

  151: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 50000,
    audioBitrate: 24,
    height: 720,
  },

  160: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "144p",
    bitrate: 100000,
    audioBitrate: null,
    height: 144,
  },

  171: {
    mimeType: 'audio/webm; codecs="vorbis"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 128,
  },

  172: {
    mimeType: 'audio/webm; codecs="vorbis"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 192,
  },

  231: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "480p",
    bitrate: 500000,
    audioBitrate: null,
    height: 480,
  },

  232: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 800000,
    audioBitrate: null,
    height: 720,
  },

  242: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "240p",
    bitrate: 100000,
    audioBitrate: null,
    height: 240,
  },

  243: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "360p",
    bitrate: 250000,
    audioBitrate: null,
    height: 360,
  },

  244: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "480p",
    bitrate: 500000,
    audioBitrate: null,
    height: 480,
  },

  247: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "720p",
    bitrate: 700000,
    audioBitrate: null,
    height: 720,
  },

  248: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1080p",
    bitrate: 1500000,
    audioBitrate: null,
    height: 1080,
  },

  249: {
    mimeType: 'audio/webm; codecs="opus"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 48,
  },

  250: {
    mimeType: 'audio/webm; codecs="opus"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 64,
  },

  251: {
    mimeType: 'audio/webm; codecs="opus"',
    qualityLabel: null,
    bitrate: null,
    audioBitrate: 160,
  },

  264: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "1440p",
    bitrate: 4000000,
    audioBitrate: null,
    height: 1440,
  },

  266: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "2160p",
    bitrate: 12500000,
    audioBitrate: null,
    height: 2160,
  },

  270: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "1080p",
    bitrate: 2500000,
    audioBitrate: null,
    height: 1080,
  },

  271: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1440p",
    bitrate: 9000000,
    audioBitrate: null,
    height: 1440,
  },

  272: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "4320p",
    bitrate: 20000000,
    audioBitrate: null,
    height: 4320,
  },

  278: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "144p 30fps",
    bitrate: 80000,
    audioBitrate: null,
    fps: 30,
    height: 144,
  },

  298: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "720p",
    bitrate: 3000000,
    audioBitrate: null,
    height: 720,
  },

  299: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "1080p",
    bitrate: 5500000,
    audioBitrate: null,
    height: 1080,
  },

  300: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "720p",
    bitrate: 1318000,
    audioBitrate: 48,
    height: 720,
  },

  301: {
    mimeType: 'video/ts; codecs="H.264, aac"',
    qualityLabel: "1080p",
    bitrate: 3000000,
    audioBitrate: 128,
    height: 1080,
  },

  302: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "720p HFR",
    bitrate: 2500000,
    audioBitrate: null,
    height: 720,
  },

  303: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1080p HFR",
    bitrate: 5000000,
    audioBitrate: null,
    height: 1080,
  },

  308: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1440p HFR",
    bitrate: 10000000,
    audioBitrate: null,
    height: 1440,
  },

  311: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "720p",
    bitrate: 1250000,
    audioBitrate: null,
    height: 720,
  },

  312: {
    mimeType: 'video/mp4; codecs="H.264"',
    qualityLabel: "1080p",
    bitrate: 2500000,
    audioBitrate: null,
    height: 1080,
  },

  313: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "2160p",
    bitrate: 13000000,
    audioBitrate: null,
    height: 2160,
  },

  315: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "2160p HFR",
    bitrate: 20000000,
    audioBitrate: null,
    height: 2160,
  },

  330: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "144p HDR, HFR",
    bitrate: 80000,
    audioBitrate: null,
    height: 144,
  },

  331: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "240p HDR, HFR",
    bitrate: 100000,
    audioBitrate: null,
    height: 240,
  },

  332: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "360p HDR, HFR",
    bitrate: 250000,
    audioBitrate: null,
    height: 360,
  },

  333: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "240p HDR, HFR",
    bitrate: 500000,
    audioBitrate: null,
    height: 240,
  },

  334: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "720p HDR, HFR",
    bitrate: 1000000,
    audioBitrate: null,
    height: 720,
  },

  335: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1080p HDR, HFR",
    bitrate: 1500000,
    audioBitrate: null,
    height: 1080,
  },

  336: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "1440p HDR, HFR",
    bitrate: 5000000,
    audioBitrate: null,
    height: 1440,
  },

  337: {
    mimeType: 'video/webm; codecs="VP9"',
    qualityLabel: "2160p HDR, HFR",
    bitrate: 12000000,
    audioBitrate: null,
    height: 2160,
  },

  394: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "144p",
    bitrate: 80000,
    audioBitrate: null,
    height: 144,
  },

  395: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "240p",
    bitrate: 250000,
    audioBitrate: null,
    height: 240,
  },

  396: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "360p",
    bitrate: 500000,
    audioBitrate: null,
    height: 360,
  },

  397: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "480p",
    bitrate: 500000,
    audioBitrate: null,
    height: 480,
  },

  398: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "720p",
    bitrate: 2000000,
    audioBitrate: null,
    height: 720,
  },

  399: {
    mimeType: 'video/mp4; codecs="av01.0.01M.08"',
    qualityLabel: "1080p",
    bitrate: 3000000,
    audioBitrate: null,
    height: 1080,
  },
};

const CHUNK_SIZE = 10 * 1024 * 1024;

class YoubetuApi {
  private chain: RequestChain;

  private AddyoutubeToken: string;

  private agent: any;

  constructor(options: {
    request: RequestChain.RequestFn;
    localCache: Cache;
    interceptor?: RequestChain.Interceptor;
    agent?: any;
  }) {
    this.agent = options.agent;
    this.chain = new RequestChain(
      {
        timeout: 10000,
        request: options.request,
        localCache: options.localCache,
      },
      options.interceptor
    );
  }

  public async queryVideos(data: {
    keyword: string;
    page: number;
    limit: number;
  }) {
    try {
      function f(t) {
        let e =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~",
          n = "";
        for (let r = 0; r < t; r++)
          n += e.charAt(Math.floor(Math.random() * e.length));
        return n;
      }

      function L(t, e) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        let r =
          "?" +
          Object.keys(t)
            .filter((e) => void 0 != t[e])
            .sort()
            .map((e) => "".concat(e, "=").concat(t[e]))
            .join("&");
        let o = f(32);
        let u = "";
        function randomCode(t) {
          let num =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 13;
          let n = "abcdefghijklmnopqrstuvwxyz";
          let r = [];
          for (let a = 0; a < t.length; a++) {
            let o = t[a];
            let u = n.indexOf(o.toLowerCase());
            if (-1 !== u) {
              for (u += num; u >= n.length; ) {
                u -= n.length;
              }
              o = o === o.toUpperCase() ? n[u] : n[u].toUpperCase();
            }
            r.push(o);
          }
          return r.join("");
        }
        const randomNum = randomCode(o);
        const decodeValue = [e, r, randomNum].join("");

        const hash = crypto.createHash("sha256");

        // Update the hash with the input data
        hash.update(decodeValue, "utf8");

        // Generate the hash digest in base64 format
        const base64Hash = hash.digest("base64");

        // Convert Base64 to URL-safe Base64 (replace '+' with '-', '/' with '_', and remove '=')
        u = base64Hash
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");

        return {
          params: t,
          headers: {
            ...n,
            "X-Request-Nonce": o,
            "X-Request-Signature": u,
          },
        };
      }

      const { params, headers } = L(
        {
          query: `site:www.youtube.com ${data.keyword}`,
          itemsCount: data.limit,
          offset: (data.page - 1) * data.limit,
          region: "zh-CN",
          freshness: "All",
        },
        "/v2/videos/search"
      );

      // https://cdn.swisscows.com/image?url=

      const response = await this.chain
        .get(`https://api.swisscows.com/v2/videos/search`)
        .query(params)
        .setHeaders(headers);

      const songs: Array<any> = [];

      response.data.items.forEach((item) => {
        const [s, f, h = 0] = item.duration.split(":").reverse();
        const duration = (Number(h) * 3600 + Number(f) * 60 + Number(s)) * 1000;

        const title = item.title.replace(/<b>|<\/b>/g, "");

        const data = {
          duration,
          cover: `https://cdn.swisscows.com/image?url=${item.thumbnailUrl}`,
          name: title,
          title: title,
          source: item.sourceUrl,
          artists: [{ name: item.creator }],
          album: item.publisher,
        };

        songs.push(data);
      });
      return songs;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private async requestTubedown(id: string) {
    return this.chain
      .post("https://tubedown.cn/api/youtube")
      .send({
        url: `https://www.youtube.com/watch?v=${id}`,
      })
      .cache("local", 60000)
      .getData();
  }

  private async requestAddyoutube(id: string) {
    if (!this.AddyoutubeToken) {
      const response = await this.chain
        .get<string>("https://addyoutube.com/")
        .cache("local", 60000)
        .setHeaders({
          "User-Agent": this.chain.getPcUserAgent("Windows"),
        });
      this.AddyoutubeToken = response.data.match(
        /<input id="csrf_token" name="csrf_token" type="hidden" value="(.+)">/
      )[1];
    }

    const response = await this.chain
      .post("https://addyoutube.com/result")
      .send({
        url: `https://www.youtube.com/watch?v=${id}`,
        submit: "Download",
        csrf_token: this.AddyoutubeToken,
      })
      .setHeaders({
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Edg/128.0.0.0",
        referer: "https://addyoutube.com/",
        origin: "https://addyoutube.com",
        "upgrade-insecure-requests": 1,
      })
      .headerFormUrlencoded();

    const root = parse(response.data);

    const title =
      root.querySelector(".card-body h4")?.innerHTML ||
      root.querySelector(".card-body h5")?.innerHTML;

    const tbody = root
      .querySelectorAll("table tbody")
      .sort((a, b) => a.childNodes.length - b.childNodes.length)
      .pop();

    const trs = tbody.querySelectorAll("tr");

    const formats = [];

    trs.forEach((item) => {
      const tds = item.querySelectorAll("td");

      const quality_types = tds[0].innerHTML
        .split(/\(|\)|\./)
        .filter((item) => item.trim());

      const format: Record<string, any> = {};

      quality_types.forEach((value) => {
        const str = value.trim();
        const [width, height] = str.split("x");
        if (Number(height) || Number(width)) {
          format.height = Number(height);
          format.width = Number(width);
          format.isVideo = true;
        } else if (str.includes("audio")) {
          format.isAudio = true;
        } else if (["m4a", "webm", "mp4"].includes(str)) {
          format.ext = str;
        } else {
          if (str.includes("p60")) {
            format.fps = 60;
          } else {
            format.fps = 30;
          }
          format.quality = str.split(",")[0];

          format.bitrate = 0;

          if (format.quality === "low") {
            format.bitrate = 64;
          }

          if (format.quality === "medium") {
            format.bitrate = 128;
          }

          if (format.quality === "high") {
            format.bitrate = 320;
          }
        }
      });

      let filesize = 0;

      if (tds[1].innerHTML.includes("KB")) {
        filesize = Number(tds[1].innerHTML.replace("KB", "")) * 1024;
      }

      if (tds[1].innerHTML.includes("MB")) {
        filesize = Number(tds[1].innerHTML.replace("MB", "")) * 1024 * 1024;
      }

      format.filesize = filesize;

      format.url = tds[2].querySelector("a").getAttribute("href");

      formats.push(format);
    });

    return { title: title.trim(), formats };
  }

  private async requestSaveForm(id: string) {
    const response = await savefrom(`https://www.youtube.com/watch?v=${id}`);
    const info = response[0] || { meta: { title: "" }, url: [] };
    const title = info.meta.title;
    const formats = info.url;
    return { title, formats };
  }

  public format(params: { title: string; formats: Array<any> }): {
    video: { mp4s: any[]; webms: any[] };
    audio: { mp4s: any[]; m4as: any[]; webms: any[] };
    title: string;
  } {
    const { title, formats } = params;
    const video = { mp4s: [], webms: [] };
    const audio = { mp4s: [], m4as: [], webms: [] };

    formats.forEach((item) => {
      const isLive = /\bsource[/=]yt_live_broadcast\b/.test(item.url);
      const isHLS = /\/manifest\/hls_(variant|playlist)\//.test(item.url);
      const isDashMPD = /\/manifest\/dash\//.test(item.url);

      const itag = (item.url.match(/itag=(\d+)/) || [])[1];

      if (!itag && !isLive && !isHLS && !isDashMPD) {
        return;
      }

      const base = FORMATS[itag] || {};

      const data = {
        filesize: 0,
        audioBitrate: 0,
        bitrate: 0,
        height: 0,
        itag,
        ...base,
        ...item,
        isLive,
        isHLS,
        isDashMPD,
      };

      if (!data.ext && data.mimeType?.includes("mp4")) {
        data.ext = "mp4";
      }

      if (!data.ext && data.mimeType?.includes("webm")) {
        data.ext = "webm";
      }
      if (!data.ext && data.mimeType?.includes("m4a")) {
        data.ext = "m4a";
      }

      if (data.height) {
        if (data.ext === "mp4") {
          video.mp4s.push(data);
        }
        if (data.ext === "webm") {
          video.webms.push(data);
        }
      } else {
        if (data.ext === "mp4") {
          audio.mp4s.push(data);
        }
        if (data.ext === "m4a") {
          audio.m4as.push(data);
        }
        if (data.ext === "webm") {
          audio.webms.push(data);
        }
      }
    });
    video.mp4s = video.mp4s
      .sort((b, a) => {
        return a.bitrate - b.bitrate;
      })
      .sort((b, a) => {
        return a.height - b.height;
      });
    video.webms = video.webms
      .sort((b, a) => {
        return a.bitrate - b.bitrate;
      })
      .sort((b, a) => {
        return a.height - b.height;
      });
    audio.mp4s = audio.mp4s
      .sort((b, a) => {
        return a.audioBitrate - b.audioBitrate;
      })
      .sort((b, a) => {
        return a.filesize - b.filesize;
      });
    audio.m4as = audio.m4as
      .sort((b, a) => {
        return a.audioBitrate - b.audioBitrate;
      })
      .sort((b, a) => {
        return a.filesize - b.filesize;
      });
    audio.webms = audio.webms
      .sort((b, a) => {
        return a.audioBitrate - b.audioBitrate;
      })
      .sort((b, a) => {
        return a.filesize - b.filesize;
      });

    return { video, audio, title };
  }

  public async getMediaInfo(id: string) {
    let method = "";

    const requestQues: Array<() => Promise<{ formats: any[]; title: string }>> =
      [
        async () => {
          method = "requestTubedown";
          return this.requestTubedown(id);
        },
        async () => {
          method = "requestSaveForm";
          return this.requestSaveForm(id);
        },
        async () => {
          method = "requestAddyoutube";
          return this.requestAddyoutube(id);
        },
      ];

    let response;
    let error: Error;

    for (const request of requestQues) {
      try {
        response = await request();
        if (!response.formats?.length) {
          throw new Error("解析异常");
        }
        break;
      } catch (err) {
        error = err;
      }
    }

    if (!response) {
      return Promise.reject(error);
    }

    const info = this.format(response);

    return {
      ...info,
      method,
    };
  }

  public async downloadSource(
    format: any,
    onProgress?: (data: {
      progress?: number;
      loaded?: number;
      total?: number;
    }) => void
  ) {
    const passThrough = new PassThrough({
      highWaterMark: 1024 * 512,
    });

    if (format.isHLS || format.isDashMPD) {
      const req = m3u8stream(format.url, {
        begin: format.isLive && Date.now(),
        requestOptions: { agent: this.agent },
        parser: format.isDashMPD ? "dash-mpd" : "m3u8",
      });
      req.on("progress", (segment, totalSegments) => {
        if (!onProgress) {
          return;
        }
        onProgress({
          loaded: segment.num,
          total: totalSegments,
          progress: Math.round((segment.num / totalSegments) * 100) / 100,
        });
      });
      req.pipe(passThrough);
    } else {
      const download_info = await this.chain.request({
        url: format.url,
        method: "HEAD",
        agent: this.agent,
      });
      const contentLength = Number(download_info.headers["content-length"]);

      let start = 0;
      let end = start + CHUNK_SIZE;

      const getNextChunk = async () => {
        try {
          if (passThrough.destroyed) {
            return;
          }
          if (end >= contentLength) end = contentLength;
          const response = await this.chain
            .request({
              url: format.url,
              method: "GET",
              responseType: "stream",
              headers: {
                Range: `bytes=${start}-${end}`,
              },
              agent: this.agent,
              // onDownloadProgress: onProgress
              //   ? (data) => {
              //       const chunck_lenght = Math.min(
              //         start + data.loaded,
              //         contentLength,
              //       );
              //       onProgress({
              //         loaded: chunck_lenght,
              //         total: contentLength,
              //         progress: Math.round(
              //           (chunck_lenght / contentLength) * 100,
              //         ),
              //       });
              //     }
              //   : undefined,
            })
            .replay(2);

          response.data.on("data", (chunk) => {
            passThrough.write(chunk);
          });

          response.data.on("end", () => {
            onProgress &&
              onProgress({
                loaded: end,
                total: contentLength,
                progress: Math.round((end / contentLength) * 100),
              });

            if (end !== contentLength) {
              start = end + 1;
              end += CHUNK_SIZE;
              getNextChunk();
            } else {
              passThrough.end();
            }
          });
        } catch (error) {
          passThrough.destroy(error);
        }
      };
      getNextChunk();
    }

    return passThrough;
  }
}

export { Wrapper, LocalCache };

export default YoubetuApi;
