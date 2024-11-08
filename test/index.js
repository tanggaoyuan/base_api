const { AliCloudApi, Wrapper, LocalCache } = require("../dist/cjs/node")
const axios = require("axios")
const path = require("path");
const { Downloader } = require("request_chain/node");
const crypto = require("crypto")
const store = new LocalCache(path.join(__dirname, 'http_chace.json'))
const http = require('http');
// const { hmac } = require("@noble/hashes/hmac")
// const { sha256 } = require("@noble/hashes/sha256")
// const { webcrypto } = require('node:crypto');
// // @ts-ignore
// if (!globalThis.crypto) globalThis.crypto = webcrypto;

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');


const axiosInstance = axios.create({
    withCredentials: true, // 保持会话
});

const ali = new AliCloudApi({
    request: Wrapper.wrapperAxios(axiosInstance),
    localCache: store,
    x_device_id: "JOldH9UH338CAXjrt+b9NsTq",
    interceptor: (config) => {
        return (response) => {
            // console.log(config.url.slice(0, 200), config.headers, response.status)
        }
    }
});



const main = async () => {

    const { refresh_token, access_token } = store.get("Token");

    // const response = await ali.refreshToken(refresh_token).getData();
    // store.set("Token", response)
    // return;

    const info = await ali.getDirs({
        token: access_token
    })

    console.log(info)

}



const test = async () => {

    try {

        const { refresh_token, access_token } = store.get("Token");

        // const response = await ali.refreshToken(refresh_token).getData();
        // store.set("Token", response)
        // return;

        // const file = await ali.getFileInfo({
        //     token: access_token,
        //     file_id: "66d6b2f2ea3ac9f9720a4da1ae9cce5690fe6877"
        // }).getData();

        // console.log("file", file)


        // const response = await ali.getDownloadUrl({
        //     file_id: '66d6b2f2ea3ac9f9720a4da1ae9cce5690fe6877',
        //     token: access_token
        // }).getData()



        // console.log("getDownloadUrl", response)

        // const downloader = await ali.downloadTask({
        //     file,
        //     token: access_token,
        //     temp_dir_path: path.join(__dirname, 'temps'),
        // })

        // await downloader.download();
        // downloader.save(`C:\\Users\\xiaogao\\Downloads`)


        await ali.download({
            file_id: '66c42761de1f544946e749cf9822cbc2c1d97833',
            token: access_token,
            save_dir_path: "C:\\Users\\xiaogao\\Downloads",
            temp_path: path.join(__dirname, 'temps'),
            part_size: 20 * 1024 * 1024,
            concurrent: 2
        })


        // const file = await ali.getFileInfo({
        //     ...token,
        //     file_id: "66c5917e852d227b3b4b44cda092a0f649134775"
        // }).getData();

        // const downloader = await ali.downloadTask({
        //     ...token,
        //     save_dir_path: "C:\\Users\\xiaogao\\Downloads",
        //     temp_dir_path: path.join(__dirname, 'temps'),
        //     file,
        // })

        // await downloader.download();

        // await downloader.save("C:\\Users\\xiaogao\\Downloads\\00053-2234872152.jpeg");
    } catch (error) {
        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", error.message)
    }


}




const sin = async () => {

    const message = "5dde4e1bdf9e4966b387ba58f4b3fdc3:JOldH9UH338CAXjrt+b9NsTp:8087f935f7b44d82867d5a28f744e234:0"

    const privateKeyArray = new Uint8Array([
        57, 100, 105, 181, 97, 210, 52, 22, 39, 58,
        254, 248, 247, 113, 242, 202, 125, 10, 199, 139,
        233, 23, 158, 95, 6, 75, 92, 120, 243, 44,
        113, 203
    ]);



    const hash = crypto.createHash('sha256').update(message).digest("hex");
    const keyPair = ec.keyFromPrivate(privateKeyArray, 'hex');
    const signature = keyPair.sign(hash, { canonical: true, der: false });

    console.log("keyPair", keyPair.getPublic("hex"), keyPair.getPrivate("hex"))

    const recovery = signature.recoveryParam;

    const [rValue, sValue] = [signature.r.toString('hex'), signature.s.toString('hex')];
    const u = `${rValue}${sValue}0${recovery}`;
    console.log(keyPair.getPrivate("hex"));
    console.log(u)


    // 644673914
    62276
    // const number = 644673914;

    // // 将数字转换为 Buffer
    // const buffer = Buffer.from('8ef15806-75c8-4726-ac77-abe8a36796f4');

    // // 编码为 Base64
    // const base64 = buffer.toString('base64');
    // console.log('Base64:', base64);



}
// sin();

const downloadlist = async () => {



    const config = await ali.getConfig().getData();
    const { refresh_token, access_token } = store.get("Token");

    // const response = await ali.refreshToken(config.app_id, refresh_token).getData();
    // store.set("Token", response)
    // return;


    const user = await ali.getUserInfo(access_token).getData();

    const token = {
        token: access_token,
        drive_id: user.resource_drive_id
    }

    // https://api.aliyundrive.com/v2/file/get_share_link_download_url
    // https://api.aliyundrive.com/v2/share_link/get_share_token

    // const list = [
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/VXuvDluR%2F644673914%2F66d6af46b296aad1561d49f39c8fb3043e8d3195%2F66d6af465a1ff30334fb4b18a166801a7ac03bbd?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YWY0NmIyOTZhYWQxNTYxZDQ5ZjM5YzhmYjMwNDNlOGQzMTk1IiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6af46b296aad1561d49f39c8fb3043e8d3195&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%273.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5eMHIjfqbkQ5bWRdnfoqmEUVuxJ2omcizz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNWapEiaeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYneA3bA8XRN7uHwufJ7FxfIREfquk63pvSlHLcLPe0Kjzzleo2k1XRPVFF%2B535IaHXuToXDnvSi4Jngm%2FXtuMkagAEdGyTHlBXTjPSMj6Ay4E%2Bb6h3JwiNtUb5TQ69fUR3fuJy2aiQw%2BD5R2hbFcubN41kOBAzFSF0sAE30fiL1muwcXy4pK2NXRxHk1nPhQ%2By5PZmPgfkMb6RgQlsFIEwW15Ff78xXsQvgPvzgx9YGdDDKrISKhgNLtSHAYHCWZf%2BI7yAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NT9W2kDf1RwztQYNaAZce5L7i&x-oss-additional-headers=referer&x-oss-expires=1726916886&x-oss-signature=CPuTBPrKafrBcV81XVJv%2BdFTItnRFBKy7ezbmYz%2FOL8%3D&x-oss-signature-version=OSS2',
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/xZk2mKsK%2F644673914%2F66d6abed6207a3fdb25f48039c9a29b20de74b56%2F66d6abed425cff35a15e4db0a00762abe7a6ebbb?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YWJlZDYyMDdhM2ZkYjI1ZjQ4MDM5YzlhMjliMjBkZTc0YjU2IiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6abed6207a3fdb25f48039c9a29b20de74b56&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25E3%2580%2590%25E7%25BB%259D%25E5%258C%25BA%25E9%259B%25B6%25E3%2580%2591%25E8%25AE%25BA%25E6%2596%2587%25E7%25BA%25A7%25E7%25AE%2580%25C2%25B7%25E6%259D%259C%25E6%2594%25BB%25E7%2595%25A5%25EF%25BC%258C100W%25E6%25A0%25B8%25E7%2588%2586%25E7%259C%259F%25E8%2583%25BD%25E6%2589%2593%25EF%25BC%2581.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5bdLoPan4YY8PGYVlLHglQWdcUblov9tjz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNQqCCSWeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYneY5UBXh6Ki4IClLcc%2BmqdsRIvJzWstJ7Gf9LWqChvSgk4TxhhcNFKSTQrInFCB0%2BcRObJl16ifVKipfXtuMkagAGoVpUPpt7j26VmlmRJwJTo8pmEVcLneQjDedr89Qllybp%2FDP%2FwnCCFjDF8A75cKtZzAYJumvUVHTD%2BeeElu%2Blh0%2BL%2FJwlyL%2BFepjqDJ15cqzc7tO%2BuldfGrgdrngZ8h11oxHW18VXD9eIcGpwGQlH59ecP3Sw12yxhsJLuLXXhEiAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NUhe9nrY9G3sTtvfTCyJ7yNVT&x-oss-additional-headers=referer&x-oss-expires=1726916929&x-oss-signature=17GUSsE0zARjNCGzrU1hLiKoYNwuJ%2Fn%2BrxC%2FX%2BIfPhs%3D&x-oss-signature-version=OSS2',
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/hbG2rIYE%2F644673914%2F66d6b2f2ea3ac9f9720a4da1ae9cce5690fe6877%2F66d6b2f2cf45a625e08b477e9ec79cbb20fa8ce5?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YjJmMmVhM2FjOWY5NzIwYTRkYTFhZTljY2U1NjkwZmU2ODc3IiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6b2f2ea3ac9f9720a4da1ae9cce5690fe6877&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25E3%2580%2590MMD_%25E6%2598%259F%25E7%25A9%25B9%25E9%2593%2581%25E9%2581%2593%25E3%2580%2591%25E6%25B5%2581%25E8%2590%25A4%2520%2528%25E0%25B9%2591%25E2%2580%25B2%25E1%25B4%2597%25E2%2580%25B5%25E0%25B9%2591%2529%25EF%25BC%25A9%2520L%25E1%25B5%2592%25E1%25B5%259B%25E1%25B5%2589%25E1%25B5%25A7%25E2%2582%2592%25E1%25B5%25A4%25E2%259D%25A4%25EF%25B8%258F%25E3%2580%2590CUPID%25E3%2580%2591.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5DNKdTsj71b5YCqRUSFp2E9brp6qavBujz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNSvsBSaeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYne0zSHWyaKi4IClLcc%2BmqdsRIvJzWstJ7Gf9LWqChvSgk4TxhhcNFKSTQrInFCB0%2BcRObJl16i8kz%2BIPXtuMkagAFPa97vKg7AWN3nNiqyJjj9fjNUqZrKW4%2FW%2F5eDtS3CH5c2dWlJwa7GCpinjgzT%2FZMdkVhYYjV2OmFfVTAip%2BryXuGL40TTtJ%2F%2Bp7Ku0RJIZodk7ewB8as85pMIyQXiNYk%2ByGCtdlimvSMJtkiPt0dm2yhh%2FayqNF4F%2Bwk8XVUluSAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NSxbnXbbzRBAGb4Cahb5VFnjX&x-oss-additional-headers=referer&x-oss-expires=1726916960&x-oss-signature=qcI4q2lDl%2FkWZo6b6SrlCLJhw5yWkC%2FWJ2h287puRDw%3D&x-oss-signature-version=OSS2',
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/sgeScqPO%2F644673914%2F66d6b2f2b7c9e816088d49068bf4c4a883980648%2F66d6b2f2113e17afafb9444a80e62f851351b14c?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YjJmMmI3YzllODE2MDg4ZDQ5MDY4YmY0YzRhODgzOTgwNjQ4IiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6b2f2b7c9e816088d49068bf4c4a883980648&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25E3%2580%2590MMD_%25E9%25B8%25A3%25E6%25BD%25AE%25E3%2580%2591%25E4%25BB%258A%25E6%25B1%2590%2520%2528%25E0%25B9%2591%25E2%2580%25B2%25E1%25B4%2597%25E2%2580%25B5%25E0%25B9%2591%2529%25EF%25BC%25A9%2520L%25E1%25B5%2592%25E1%25B5%259B%25E1%25B5%2589%25E1%25B5%25A7%25E2%2582%2592%25E1%25B5%25A4%25E2%259D%25A4%25EF%25B8%258F%25E3%2580%2590PANDORA%25E3%2580%2591_%25E3%2580%2590%25E8%25A1%25A5%25E6%25A1%25A3%25E3%2580%2591.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5bcBY782ZF44%2FqhRxXXvjY9VttY1rTP2zz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNQuYeyWeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYneY73R9nRN7uHwufJ7FxfIREfquk63pvSlHLcLPe0Kjzzleo2k1XRPVFF%2B535IaHXuToXDnvSil0TcoPXtuMkagAEwks7pDppfYbc0Qzlkxdjvm963M%2FYNNAkSnPfag56joiCnIx7tRwQ8GENNzWKXBILQ%2FEH57vxDiUEEDrxxToc7ZzBKJ29e4IfYrvYqxHOCdgDYRQRqwwwWK6L0M4RHFWzW9gvTzckL1eoGuUEA66Up7fdw3U%2FQBgQ8MRm2OJX6TCAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NUiN4H4NYT8JE3fZ6hZTt9qd9&x-oss-additional-headers=referer&x-oss-expires=1726916979&x-oss-signature=MEGADwYWNnLijn4Mw%2BLdM7F42ekTLPr0hkysm2pD10I%3D&x-oss-signature-version=OSS2',
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/AcoixRjo%2F644673914%2F66d6b2a746c5c36dbaca4e91a459ef3daf93069f%2F66d6b2a7b114d71017d2456083af881c25e4ea4c?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YjJhNzQ2YzVjMzZkYmFjYTRlOTFhNDU5ZWYzZGFmOTMwNjlmIiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6b2a746c5c36dbaca4e91a459ef3daf93069f&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%270003.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5fHHsPNr6pGg5PeMRXgsVEvVcFhnIaZozz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNVjzCCWeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYnewzHK6QRN7uHwufJ7FxfIREfquk63pvSlHLcLPe0Kjzzleo2k1XRPVFF%2B535IaHXuToXDnvSi0%2BeB%2BfXtuMkagAEjI6QJjQV6qD78zuNObiYjzbCjTbQ9fU%2BkZnoKK9FKQ%2BwpxtlCzE%2FtUr7L4gwsgWikjAc6mnJyFYUl3h0cvVFgHgmLK%2BWavUAKhYq9fRxDPzsvTIFHR52B9Kp5DPRgLEgJAKAjH2takEWt6J90SaXHxOvSyKtEpyq47F92DPgeKiAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NTrUyyBug4Q533QUQzYNMsC2A&x-oss-additional-headers=referer&x-oss-expires=1726917232&x-oss-signature=v7MkNQlmTmRb9uckeiAU8Fkxk0nTdxnzWvOLgKeVT8Y%3D&x-oss-signature-version=OSS2',
    //     'https://bj29-hz.cn-hangzhou.data.alicloudccp.com/DRygnv99%2F644673914%2F66d6b292d7f2dd2480ba4b74b21fe5140bf8e152%2F66d6b292b8e60266c198437a8ca7a6aa59b2306d?callback=eyJjYWxsYmFja1VybCI6Imh0dHA6Ly9iajI5LmFwaS1ocC5hbGl5dW5wZHMuY29tL3YyL2ZpbGUvZG93bmxvYWRfY2FsbGJhY2siLCJjYWxsYmFja0JvZHkiOiJodHRwSGVhZGVyLnJhbmdlPSR7aHR0cEhlYWRlci5yYW5nZX1cdTAwMjZidWNrZXQ9JHtidWNrZXR9XHUwMDI2b2JqZWN0PSR7b2JqZWN0fVx1MDAyNmRvbWFpbl9pZD0ke3g6ZG9tYWluX2lkfVx1MDAyNnVzZXJfaWQ9JHt4OnVzZXJfaWR9XHUwMDI2ZHJpdmVfaWQ9JHt4OmRyaXZlX2lkfVx1MDAyNmZpbGVfaWQ9JHt4OmZpbGVfaWR9XHUwMDI2cGRzX3BhcmFtcz0ke3g6cGRzX3BhcmFtc31cdTAwMjZ2ZXJzaW9uPSR7eDp2ZXJzaW9ufSIsImNhbGxiYWNrQm9keVR5cGUiOiJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQiLCJjYWxsYmFja1N0YWdlIjoiYmVmb3JlLWV4ZWN1dGUiLCJjYWxsYmFja0ZhaWx1cmVBY3Rpb24iOiJpZ25vcmUifQ%3D%3D&callback-var=eyJ4OmRvbWFpbl9pZCI6ImJqMjkiLCJ4OnVzZXJfaWQiOiI4MDg3ZjkzNWY3YjQ0ZDgyODY3ZDVhMjhmNzQ0ZTIzNCIsIng6ZHJpdmVfaWQiOiI2NDQ2NzM5MTQiLCJ4OmZpbGVfaWQiOiI2NmQ2YjI5MmQ3ZjJkZDI0ODBiYTRiNzRiMjFmZTUxNDBiZjhlMTUyIiwieDpwZHNfcGFyYW1zIjoie1wiYXBcIjpcIjI1ZHpYM3ZiWXFrdFZ4eVhcIn0iLCJ4OnZlcnNpb24iOiJ2MyJ9&di=bj29&dr=644673914&f=66d6b292d7f2dd2480ba4b74b21fe5140bf8e152&pds-params=%7B%22ap%22%3A%2225dzX3vbYqktVxyX%22%7D&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%270002.mp4&security-token=CAISvgJ1q6Ft5B2yfSjIr5fFLer%2B3JRg2YetSHXb1WYHXL1ouo3Imzz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNWbnCSWeq1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYneA7bNyQRN7uHwufJ7FxfIREfquk63pvSlHLcLPe0Kjzzleo2k1XRPVFF%2B535IaHXuToXDnvSiBj8mE%2FXtuMkagAFbbcydnZFquO8A9DkL3zwFNjbzYr4wE9SnyZ5R32yvR1CpV4PunYbYYFXC%2Bj2wOk2F3EqPEMN6ViiGpamUZdfs%2Fflc3GuKp4tnx833b8prgCBIsnD4%2B4IYNMAZXfYbGr6TF%2Ft93ew3MeyMC4dbmCCvgX5wAbyDHzeBXZVWhAJ1qCAA&u=8087f935f7b44d82867d5a28f744e234&x-oss-access-key-id=STS.NTpfPJ1KAnEFJSj1fRP2DUHcy&x-oss-additional-headers=referer&x-oss-expires=1726917257&x-oss-signature=Ik3RUBj7wB%2BTUEUZV%2Bwdv7YEx%2BcZ8h33p%2FkhzsZR8YM%3D&x-oss-signature-version=OSS2'
    // ];


    // for (const url of list) {
    //     const downloader = new Downloader({
    //         request: (config) => {
    //             config.headers.Referer = 'https://www.aliyundrive.com/'
    //             config.headers.connection = "keep-alive"
    //             return ali.chain.request(config)
    //         },
    //         url,
    //         part_size: 20 * 1024 * 1024,
    //         temp_path: path.join(__dirname, 'temps'),
    //     })
    //     await downloader.download(2);
    //     await downloader.save(__dirname);
    // }



    const tree = await ali.extractLinksFromDirs({
        ...token,
        file_id: "66c42761de1f544946e749cf9822cbc2c1d97833"
    });

    const list = [...tree.children];

    while (list.length) {
        const file = list.shift();
        if (file.children) {
            list.push(...file.children)
        }
        if (file.type === "file") {
            const downloader = new Downloader({
                request: (config) => {
                    config.headers.Referer = 'https://www.aliyundrive.com/'
                    config.headers.connection = "keep-alive"
                    return ali.chain.request(config)
                },
                url: file.download_url,
                // part_size: 30 * 1024 * 1024,
                temp_path: path.join(__dirname, 'temps'),
            })
            await downloader.download();
            await downloader.save(__dirname);
        }
    }

}


const check = () => {

    // 生成签名的函数
    const generateSignature = (secret, payload) => {
        return crypto.createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    // 验证 Webhook 的函数
    const verifyWebhook = (req, secret) => {
        const receivedSignature = req.headers['x-signature'];
        const receivedSignatureV2 = req.headers['x-signature-v2'];
        const receivedNonce = req.headers['x-nonce'];
        const receivedTimestamp = req.headers['x-timestamp'];
        const payload = JSON.stringify(req.body);

        // 验证 x-timestamp 是否在有效时间范围内（例如5分钟）
        const currentTime = Date.now();
        const timestampDiff = currentTime - parseInt(receivedTimestamp, 10);
        const timeLimit = 5 * 60 * 1000; // 5分钟

        if (timestampDiff > timeLimit) {
            return { valid: false, reason: 'Timestamp expired' };
        }

        // 检查 x-nonce 是否唯一（你需要自己实现存储和检查机制）
        // 假设有一个存储用于存储已处理的 nonce
        const isNonceUsed = checkNonce(receivedNonce);
        if (isNonceUsed) {
            return { valid: false, reason: 'Nonce already used' };
        }

        // 生成签名
        const calculatedSignature = generateSignature(secret, payload);
        const calculatedSignatureV2 = generateSignature(secret, payload); // 如果有不同逻辑，请根据需求调整

        // 验证签名
        if (calculatedSignature === receivedSignature && calculatedSignatureV2 === receivedSignatureV2) {
            return { valid: true };
        } else {
            return { valid: false, reason: 'Invalid signature' };
        }
    }

    // 示例 nonce 检查函数
    function checkNonce(nonce) {
        // 这里实现你的逻辑来检查 nonce 是否已被使用
        // 可以是一个简单的数组或数据库查询
        return false; // 默认返回 false 以表示未使用
    }

    // 使用示例
    const req = {
        headers: {
            'x-signature': '8b9dd02989e83b723ebfe8223ed9a8d748d462f82cddb0e592d8d1c07c60cd7c4491aeeee7afd3cd1a353069539fd40144d2508cf1b58b9af3c9c6397dba576200',
            'x-signature-v2': '48ff049f405230338dc337aaab6b46f3d5b7bb1a',
            'x-nonce': '2ab6fc45-a68f-4a56-a8c9-2ec448026bdf',
            'x-timestamp': '1726934969128'
        },
        body: {} // 填入实际消息体
    };

    const secret = crypto.randomBytes(32).toString('hex'); // 替换为你的 Webhook Secret
    const verificationResult = verifyWebhook(req, secret);
    console.log(verificationResult);

}



console.log(ali.generateRandomDeviceId())