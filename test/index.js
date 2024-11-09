const axios = require("axios");
const { AliCloudApi, LocalCache, Wrapper } = require("base_api/node");

const store = new LocalCache("./test/cache_http.json");

const api = new AliCloudApi({
    localCache: store,
    request: Wrapper.wrapperAxios(axios),
});

const getRequestParams = async () => {
    const token = store.get("token");
    if (new Date(token.token_expire_time).getTime() < Date.now()) {
        const result = await api
            .refreshToken(token.app_id, token.refresh_token)
            .getData();
        token.refresh_token = result.refresh_token;
        token.token = result.access_token;
        token.token_expire_time = result.expire_time;
        store.set("token", token);
    }
    return api.generateRequestParams(token);
};

const test = async () => {
    const params = await getRequestParams();

    const response = await api.getNotes({
        limit: 10,
        status: 3
    }, params).getData();


    console.log("response", response)

    // const response = await api.createNoteText({
    //     title: "测试",
    //     value: "哈哈访问佛问佛我怕更名为【怕"
    // }, params).getData()


    // console.log("response", response)


    // const docs = ['f6fc9691e26480c8c09bd69e9306d6ce1884f8da']

    // const response = await api.removeNote({
    //     doc_ids: docs,
    //     operation: 3,
    // }, params)


    // console.log("response", response)


    // const doc_id = 'c0eebdfbe16490f2a7dbac9d93069d8d1a3629b2';

    // const info = await api.getNote(doc_id, params).getData();

    // console.log("info", info)

    // const response = await api.editNote({
    //     doc_id,
    //     ops: [
    //         {
    //             op: "replace",
    //             path: 0,
    //             value: ["p", {}, ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, "哈哈哈哈"]]]
    //         }
    //     ],
    //     version: 7,
    // }, params)

    // console.log("response", response)



    // const response = await api.createNote({
    //     title: '欢迎使用笔记',
    //     "summary": "阿里云盘「笔记」是你在数字生活中的又一个伙伴，帮助你随时记录生活、学习、工作中的各种重要信息。你的每一次起心动念，都会留下属于自己的思想痕迹。抓住它们、记录它们，它们会是你在数字世界中重要的资产。 · 笔记能做什么？\n · 阿里云盘「笔记」将有两大核心能力：\n · 1. 在云盘中跨云服务记录想法 · 1. 管理信息、知识 · \uD83D\uDC47下面我们简单为大家介绍一下笔记的具体功能：\n · 灵活强大的编辑器\n",
    //     value: [
    //         [
    //             "p",
    //             {},
    //             [
    //                 "span",
    //                 { "data-type": "text" },
    //                 [
    //                     "span",
    //                     { "data-type": "leaf" },
    //                     "阿里云盘「笔记」是你在数字生活中的又一个伙伴，帮助你随时记录生活、学习、工作中的各种重要信息。你的每一次起心动念，都会留下属于自己的思想痕迹。抓住它们、记录它们，它们会是你在数字世界中重要的资产。"
    //                 ]
    //             ]
    //         ],
    //         [
    //             "h2",
    //             { "spacing": { "before": 14.666666666666668, "after": 14.666666666666668, "line": 0.8529411764705882 } },
    //             ["span", { "data-type": "text" }, ["span", { "bold": true, "sz": 16, "szUnit": "pt", "data-type": "leaf" }, "笔记能做什么？\n"]]
    //         ],
    //         ["p", { "ind": { "left": 0 } }, ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, "阿里云盘「笔记」将有两大核心能力：\n"]]],
    //         [
    //             "p",
    //             {
    //                 "ind": { "left": 0 },
    //                 "list": { "listId": "kak98pl4pzh", "level": 0, "isOrdered": true, "isTaskList": false, "listStyleType": "DEC_LEN_LROM_P", "symbolStyle": {}, "listStyle": { "format": "decimal", "text": "%1.", "align": "left" }, "hideSymbol": false }
    //             },
    //             ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, "在云盘中跨"], ["span", { "bold": true, "data-type": "leaf" }, "云服务"], ["span", { "data-type": "leaf" }, "记录想法"]]
    //         ],
    //         [
    //             "p",
    //             {},
    //             ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, ""]],
    //             [
    //                 "object",
    //                 {
    //                     "dataCategory": "image",
    //                     "dataId": "0079012b-d4c9-43b0-ad46-a394ef944aa4",
    //                     "dataAppId": "anote",
    //                     "dataObjectId": "9600002_61754388dab29ac982464de485c38a5f67d07bc1",
    //                     "dataResourceType": "file",
    //                     "dataMetadata": { "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" },
    //                     "aslMetadata": {},
    //                     "dataPreviewUrl": "https://bj29.cn-beijing.data.alicloudccp.com/2GhCur3G%2F...",
    //                     "dataSrc": "https://bj29.cn-beijing.data.alicloudccp.com/2GhCur3G%2F..."
    //                 },
    //                 ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, ""]]
    //             ],
    //             ["span", { "data-type": "text" }, ["span", { "data-type": "leaf" }, "\n"]]
    //         ]
    //     ]
    // }, params);


    // const doc_id = "cc9b86fce16490b7c890b19d9306bdd68d9e1557"




    // console.log("response", response)

};





test();
