// 99bb7f3cbfa30b43bca74c3480b15cea371c599af6a191902454df52ab932d04

const { machineId } = require("node-machine-id")
const os = require('os')
const crypto = require('crypto');
const path = require("path");
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const test = async () => {

    const id = await machineId();
    const deviceName = os.hostname();
    console.log(id, deviceName)

}


const genetate = () => {

    // const keyPair = ec.genKeyPair();

    // // 获取公钥和私钥
    // const publicKey = keyPair.getPublic('hex');
    // const privateKey = keyPair.getPrivate('hex');

    // console.log(privateKey, publicKey)

    // const privateKey = '89162a475e4f2d3f6e980d848fd87bf138ff8c7764ffe4272d5f054bcb64a9'
    // // // 获取公钥
    // const publicKeyaa = ec.keyFromPrivate(privateKey).getPublic('hex');
    // console.log(publicKeyaa)

    // 4db1eb44fea40ac685bdbe9cb328ffa37f9f36a10d3e947679f8fa5cf7772e4678eb98a550f22b3c64c33fd4a7dfcaff2bb2ae76432bc6884e5c3a954d3f18ec01

    // const message = `5dde4e1bdf9e4966b387ba58f4b3fdc3:Dpl2H5z6kWYCAXjrsIqX5M0D:8087f935f7b44d82867d5a28f744e234:3`;
    const message = "5dde4e1bdf9e4966b387ba58f4b3fdc3:Dpl2H5z6kWYCAXjrsIqX5M0D:8087f935f7b44d82867d5a28f744e234:6"
    const hash = crypto.createHash("sha256").update(message).digest("hex");
    const result = secp
        .keyFromPrivate(privateKey, "hex")
        .sign(hash, { canonical: true });
    const recovery = result.recoveryParam;
    const [r, s] = [result.r.toString("hex"), result.s.toString("hex")];
    console.log(`${r}${s}0${recovery}`)
}



const sin = async () => {


    const { hmac } = require("@noble/hashes/hmac")
    const { sha256 } = require("@noble/hashes/sha256")
    const { webcrypto } = require('node:crypto');
    // @ts-ignore
    if (!globalThis.crypto) globalThis.crypto = webcrypto;
    const secp = await import("@noble/secp256k1")
    secp.etc.hmacSha256Sync = (k, ...m) => hmac(sha256, k, secp.etc.concatBytes(...m))



    const generateNonce = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (e) {
                var t = (16 * Math.random()) | 0;
                return ("x" == e ? t : (3 & t) | 8).toString(16);
            }
        );
    }

    const privateKeyHex = 'e840adda2d9d4bb12b820671d95ac0ab2a29316afd27d8fc44faf42a7b7adb4e';

    // const message = "5dde4e1bdf9e4966b387ba58f4b3fdc3:JOldH9UH338CAXjrt+b9NsTp:8087f935f7b44d82867d5a28f744e234:0"
    // const hash = crypto.createHash("sha256").update(message).digest("hex");
    // const signature = await secp.signAsync(hash, privateKeyHex)

    const publicKeyHex = secp.etc.bytesToHex(secp.getPublicKey(privateKeyHex, false))

    console.log("publicKeyHex", publicKeyHex)

    function generateSignature(privateKeyHex) {
        const privateKey = Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
        const xNonce = generateNonce(); // Generate a random nonce
        const xTimestamp = Date.now(); // Current timestamp

        const message = `${xNonce}${xTimestamp}`;
        const messageHash = sha256(new TextEncoder().encode(message));
        const signature = secp.sign(messageHash, privateKey);

        return {
            xNonce,
            xTimestamp,
            xSignature: signature.toCompactHex()
        };
    }

    function verifySignature(publicKeyHex, xNonce, xTimestamp, xSignature) {
        const publicKey = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
        const message = `${xNonce}${xTimestamp}`;
        const messageHash = sha256(new TextEncoder().encode(message));
        const signature = Uint8Array.from(Buffer.from(xSignature, 'hex'));

        return secp.verify(signature, messageHash, publicKey);
    }


    const info = generateSignature(privateKeyHex)

    console.log(info)

    console.log(verifySignature(publicKeyHex, info.xNonce, info.xTimestamp, info.xSignature))



}


const poje = () => {


    const elliptic = require('elliptic');
    const EC = elliptic.ec;
    const ec = new EC('secp256k1'); // 根据你的密钥类型选择曲线


    const timestamp = 1727512628517
    const nonce = "404acdc5-8b7c-4f25-b4bc-dd22d976b37d"

    const publicKey = '049cfd77768bcf95633cdeb7fcd6fee36c8184aa3bd939fa4bf9002e6adae068d035200a080b14924cc546bba98263b5a5d073ff4813eff7b074ad155c3e34001a';
    const message = `${nonce}:${timestamp}`; // 替换为实际消息
    const signature = 'a1886b3b646a1948ef7d99d5e40cd57e220d01fb'; // 替换为实际签名
    const hash = crypto.createHash("sha256").update(message).digest("hex");
    const key = ec.keyFromPublic(publicKey, 'hex');

    const value = key.sign(hash, { canonical: true })

    console.log("value", value)

    // const isValid = key.verify(msg, signature);

    // console.log(`签名有效性: ${isValid}`);


}


const afc = () => {

    let i = 0;

    i++;
    console.log(i)
}

afc()