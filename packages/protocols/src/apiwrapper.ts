import axios from "axios";

class APIWrapperFactory {
    private static instance: APIWrapperFactory;
    private static cursorMap = new Map<string, any>();

    private constructor() {}

    public static getInstance(): APIWrapperFactory {
        if (!this.instance) {
            this.instance = new APIWrapperFactory();
        }
        return this.instance;
    }

    /**
     * Simplify parameter input.
     * Refine the return value of Http request. Remove unnecessary field.
     */

    public static async executeRequest(
        obj: any,
        taskId: string
    ): Promise<any | undefined> {
        // {"route": "notes_search","params": {"key1": "v1","key2": "v2"}}
        console.log(`executeRequest params: ${JSON.stringify(obj)}`);
        let result;
        switch (obj.route) {
            case "get_user":
                console.log(`get_user params: ${JSON.stringify(obj)}`);
                const userId = obj?.params?.userId;
                // http://47.120.60.92:8080/api/userInfo?userId=66896ebc000000000303084b
                try {
                    const urlUserInfo = `http://47.120.60.92:8080/api/userInfo?userId=${userId}`;
                    console.log(`urlUserInfo with params: ${urlUserInfo}`);
                    const response = await axios.get(urlUserInfo);
                    /**
                     * User response:
                     * {
    "code": 0, 
    "data": {
        "bannerImage": "http://sns-avatar-qc.xhscdn.com/user_banner/1040g2k0317g840i40o504ajpnf1570serphodb8?imageView2/2/w/540/format/jpg", 
        "boards": 0, 
        "brandAccountInfo": {
            "bannerImage": ""
        }, 
        "collected": 194, 
        "desc": "去奔跑，去跌倒，去大笑，去哭泣\n努力向上\n一个真诚的我", 
        "fans": 277, 
        "follows": 41, 
        "fstatus": "none", 
        "gender": 1, 
        "id": "5b8142534dcc06000187838e", 
        "image": "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo30ruhem0sik004ajpnf1570sec7798oo?imageView2/2/w/360/format/webp", 
        "ip_location": "天津", 
        "level": {
            "image_link": "", 
            "number": 0
        }, 
        "liked": 1290, 
        "location": "", 
        "nickname": "生活。", 
        "noteCollectionIsPublic": "", 
        "notes": 1, 
        "officialVerified": false, 
        "officialVerifyIcon": "", 
        "officialVerifyName": "", 
        "redOfficialVerifyIconType": 0, 
        "redOfficialVerifyShowIcon": "", 
        "redOfficialVerifyType": "", 
        "red_id": "549596309", 
        "tags": [
            {
                "icon": "http://ci.xiaohongshu.com/icons/user/gender-female-v1.png", 
                "tag_type": "info"
            }
        ], 
        "verifyContent": ""
    }, 
    "message": null, 
    "recordTime": "2025-05-27T15:13:35.384404632"
}
}
                     */
                    console.log(JSON.stringify(response.data));
                    const {
                        desc,
                        fans,
                        follows,
                        gender,
                        id,
                        ip_location,
                        location,
                        nickname,
                        notes,
                        tags,
                    } = response.data.data;
                    /**  gender: 2, 性别未设置或者是机构账号无性别。 gender: 1, 性别女。gender: 0, 性别男*/
                    let genderStr;
                    switch (gender) {
                        case 0:
                            genderStr = "性别男";
                            break;
                        case 1:
                            genderStr = "性别女";
                            break;
                        case 2:
                            genderStr = "性别未设置或者是机构账号无性别";
                            break;
                        default:
                            genderStr = "未知性别";
                    }
                    result = {
                        desc,
                        fans,
                        follows,
                        genderStr,
                        id,
                        ip_location,
                        location,
                        nickname,
                        note_count: notes,
                        tags,
                    };
                } catch (error) {
                    console.error("Failed to fetch user info:", error);
                    result = "Feach data error, msg: " + error.msg;
                }
                break;
            case "hot_words":
                try {
                    const page = obj?.params?.page || 1;
                    console.log("Fetching hot words... page: " + page);

                    const response = await axios.post(
                        "https://gw.newrank.cn/api/xhsv2/nr/app/xh/v2/rank/hotWordHotList",
                        {
                            typeV1: "",
                            typeV2: "",
                            rankType: "day",
                            rankDate: "2025-05-23",
                            recentType: "",
                            size: 20,
                            start: page,
                            isNew: "",
                            isBoom: "",
                            sort: "hot_score",
                        },
                        {
                            headers: {
                                Accept: "*/*",
                                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                                Connection: "keep-alive",
                                Origin: "https://xh.newrank.cn",
                                Referer: "https://xh.newrank.cn/",
                                "Sec-Fetch-Dest": "empty",
                                "Sec-Fetch-Mode": "cors",
                                "Sec-Fetch-Site": "same-site",
                                "User-Agent":
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                                "content-type": "application/json",
                                "n-token": "35c430ef650b459ba2b9c1409148d929",
                                request_id: "c9b9d84a71c0404fa4b5fbcab71b363a",
                                "sec-ch-ua":
                                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                                "sec-ch-ua-mobile": "?0",
                                "sec-ch-ua-platform": '"Windows"',
                                Cookie: "acw_tc=0a47314717480864781788680e00672d0661eab290838cdcce5932cfb5947f; token=0381E28A719D4DABA0898104248AE231; auth_n=p3qiBagdm3WjuBOG+VuZUyIOgpsFwMSOch8wEX11GBY36j1TkIx9ExqX7Eo51hTf; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219584822882c1-055782b437e7d7-26011d51-1327104-19584822883c64%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4MjI4ODJjMS0wNTU3ODJiNDM3ZTdkNy0yNjAxMWQ1MS0xMzI3MTA0LTE5NTg0ODIyODgzYzY0IiwiJGlkZW50aXR5X2xvZ2luX2lkIjoibnJfbXkyYjlhejZ5In0%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D",
                            },
                        }
                    );

                    result = (response.data?.data?.list || []).map((item) => ({
                        hotWord: item.hotWord || "",
                        rankDate: item.rankDate || "",
                        noteCount: item.noteCount || 0,
                        dayCount: item.dayCount || 0,
                    }));
                    console.log("Fetched hot words: " + JSON.stringify(result));
                    console.log("Fetched hot words: " + result.length);
                } catch (error) {
                    console.error("Failed to fetch hot words:", error);
                    result = [];
                }
                break;
            case "hot_topics":
                try {
                    const page = obj?.params?.page || 1;
                    console.log("Fetching hot words... page: " + page);

                    const response = await axios.post(
                        "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/topicRank",
                        {
                            type: "\u5168\u90E8",
                            topicSecondType: "",
                            dateType: 3,
                            rankDate: "2025-04-01",
                            isBrandTopic: "0",
                            sort: "interactiveCount",
                            size: 20,
                            start: page,
                        },
                        {
                            headers: {
                                Accept: "*/*",
                                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                                Connection: "keep-alive",
                                Origin: "https://xh.newrank.cn",
                                Referer: "https://xh.newrank.cn/",
                                "Sec-Fetch-Dest": "empty",
                                "Sec-Fetch-Mode": "cors",
                                "Sec-Fetch-Site": "same-site",
                                "User-Agent":
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                                "content-type": "application/json",
                                "n-token": "35c430ef650b459ba2b9c1409148d929",
                                request_id: "945933bd712a4ea6a74bd6385992986c",
                                "sec-ch-ua":
                                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                                "sec-ch-ua-mobile": "?0",
                                "sec-ch-ua-platform": '"Windows"',
                                Cookie: "acw_tc=0a47314717480864781788680e00672d0661eab290838cdcce5932cfb5947f; token=0381E28A719D4DABA0898104248AE231; auth_n=p3qiBagdm3WjuBOG+VuZUyIOgpsFwMSOch8wEX11GBY36j1TkIx9ExqX7Eo51hTf; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219584822882c1-055782b437e7d7-26011d51-1327104-19584822883c64%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4MjI4ODJjMS0wNTU3ODJiNDM3ZTdkNy0yNjAxMWQ1MS0xMzI3MTA0LTE5NTg0ODIyODgzYzY0IiwiJGlkZW50aXR5X2xvZ2luX2lkIjoibnJfbXkyYjlhejZ5In0%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D",
                            },
                        }
                    );

                    result = (response.data?.data?.list || []).map((item) => ({
                        discussAdd: item.discussAdd,
                        topicName: item.topicName,
                        interactiveCount: item.interactiveCount,
                        noteNum: item.noteNum,
                        viewAdd: item.viewAdd,
                        topicType: item.topicType,
                        topicSecondType: item.topicSecondType,
                    }));
                    console.log(
                        "my result Fetched hot topics: " +
                            JSON.stringify(result)
                    );
                } catch (error) {
                    console.log("Error fetching hot topics:", error);
                    result = [];
                }
                break;
            case "notes_comment_by_next_page":
                const lastCursor =
                    APIWrapperFactory.cursorMap.get(taskId) || "";
                if (lastCursor === "blank_holder") {
                    console.log(`executeRequest lastCursor is blank_holder`);
                    APIWrapperFactory.cursorMap.set(taskId, "");
                    return;
                }
                const urlWithparams = `http://47.120.60.92:8080/api/comment?noteId=${obj?.params?.noteId}&lastCursor=${lastCursor}`;
                console.log(`executeRequest urlWithparams: ${urlWithparams}`);
                const response = await axios.get(urlWithparams);
                // http://47.120.60.92:8080/api/comment?noteId=682eb2aa0000000021005a6d&lastCursor=
                console.log(
                    `executeRequest response: ${JSON.stringify(response.data)}`
                );
                const cursor = response.data?.data?.cursor;
                if (cursor !== undefined) {
                    try {
                        obj = JSON.parse(cursor) || {};
                    } catch (error) {
                        if (cursor) {
                            obj.cursor = cursor;
                        }
                        console.error("Failed to parse cursor:", error);
                    }
                    console.log(
                        `executeRequest obj cursor: ${JSON.stringify(
                            obj.cursor
                        )}`
                    );
                    APIWrapperFactory.cursorMap.set(taskId, obj.cursor);
                } else {
                    console.log(`executeRequest cursor is undefined`);
                    APIWrapperFactory.cursorMap.set(taskId, "blank_holder");
                }

                function filterComments(comments) {
                    return comments.map((comment) => {
                        const filteredComment = {
                            content: comment?.content || "",
                            ip_location: comment?.ip_location || "",
                            time: comment?.time || "",
                            username: comment?.user?.nickname || "",
                        };

                        if (
                            comment.sub_comments &&
                            comment.sub_comments.length > 0
                        ) {
                            filteredComment.sub_comments =
                                comment.sub_comments.map((subComment) => ({
                                    content: subComment?.content || "",
                                    ip_location: subComment?.ip_location || "",
                                    time: subComment?.time || "",
                                    username: subComment?.user?.nickname || "",
                                }));
                        }

                        return filteredComment;
                    });
                }

                const comments = filterComments(
                    response.data?.data?.comments || []
                );

                result = filterComments(comments);
                console.log(`executeRequest result: ${result.length}`);
                break;

            case "get_note_list":
                {
                    const note_curosr_key = "get_note_list_" + taskId;
                    const lastCursor =
                        APIWrapperFactory.cursorMap.get(note_curosr_key) || "";
                    if (lastCursor === "blank_holder") {
                        console.log(
                            `executeRequest lastCursor is blank_holder`
                        );
                        APIWrapperFactory.cursorMap.set(note_curosr_key, "");
                        return null;
                    }
                    const urlWithparams = `http://47.120.60.92:8080/api/noteList?userId=${obj?.params?.userId}&lastCursor=${lastCursor}`;
                    console.log(
                        `executeRequest urlWithparams: ${urlWithparams}`
                    );
                    const response = await axios.get(urlWithparams);
                    // http://47.120.60.92:8080/api/noteList?userId=66896ebc000000000303084b&lastCursor=
                    // console.log(
                    //     `executeRequest response: ${JSON.stringify(response.data)}`
                    // );
                    let lastestCursor = null;

                    function filterNotes(notes) {
                        return notes.map((note) => {
                            lastestCursor = note?.cursor;
                            // console.log(`executeRequest note: ${JSON.stringify(note)}`);
                            const filteredNote = {
                                share_count: note?.share_count || "",
                                title: note?.title || "",
                                linkes_count: note?.likes || "",
                                collected_count: note?.collected_count || "",
                                comments_count: note?.comments_count || "",
                                nickname: note?.user?.nickname || "",
                                display_title: note?.display_title || "",
                                note_id: note?.id || "",
                                desc: note?.desc || "",
                                create_time: note?.create_time || "",
                            };
                            return filteredNote;
                        });
                    }

                    result = filterNotes(response.data?.data?.notes || []);
                    // const cursor = lastestCursor;
                    if (lastestCursor) {
                        // try {
                        //     obj = JSON.parse(cursor) || {};
                        // } catch (error) {
                        //     if (cursor) {
                        //         obj.cursor = cursor;
                        //     }
                        //     console.error("Failed to parse cursor:", error);
                        // }
                        // console.log(
                        //     `executeRequest obj cursor: ${JSON.stringify(
                        //         obj?.cursor
                        //     )}`
                        // );
                        APIWrapperFactory.cursorMap.set(
                            note_curosr_key,
                            lastestCursor
                        );
                    } else {
                        console.log(`executeRequest cursor is undefined`);
                        APIWrapperFactory.cursorMap.set(
                            note_curosr_key,
                            "blank_holder"
                        );
                    }
                    // console.log(`executeRequest result 2333333: ${JSON.stringify(result)}`);
                }

                break;

            case "notes_search":
                try {
                    const url = `http://47.120.60.92:8080/api/search?keyword=${obj?.params?.keyword}&page=${obj?.params?.page}&sort=popularity_descending`;
                    console.log(`executeRequest url by params: ${url}`);
                    const response = await axios.get(url);
                    console.log(
                        `executeRequest response: ${JSON.stringify(
                            response.data
                        ).slice(0, 300)}`
                    );

                    console.log(
                        `executeRequest response.data.data.items: ${response.data?.data?.items?.length}`
                    );

                    result = (response.data?.data?.items || []).map((obj) => ({
                        author: obj?.note?.user?.nickname || "unknown",
                        collected_count: obj?.note?.collected_count || 0,
                        shared_count: obj?.note?.shared_count || 0,
                        liked_count: obj?.note?.liked_count || 0,
                        comments_count: obj?.note?.comments_count || 0,
                        id: obj?.note?.id,
                        title: obj?.note?.title,
                        desc: obj?.note?.desc || "",
                        timestamp: obj?.note?.timestamp || 0,
                    }));
                    console.log(`executeRequest result: ${result.length}`);
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
                break;
            default:
                console.error(`Unknown route: ${JSON.stringify(obj)}`);
        }
        // console.log(`executeRequest result: ${JSON.stringify(result)}`);
        return result;
    }

    // async getHotWords(page = 1) {
    //     return RedNoteHotwordAPI.getHotWords(page);
    // }

    // async getTopicRank(page = 1) {
    //     return RedNoteTopicAPI.getTopicRank(page);
    // }

    // async getCommentNextPage(noteId: string) {
    //     const commentAPI = new RedNoteCommentAPI(noteId);
    //     return commentAPI.nextPage();
    // }

    // async getAllComments(noteId: string, delay = 500) {
    //     const commentAPI = new RedNoteCommentAPI(noteId);
    //     return commentAPI.getAllComments(delay);
    // }

    // async search(keyword: string, page = 1) {
    //     const sortType = "popularity_descending";
    //     const searchAPI = new RedNoteSearchAPI(keyword, sortType);
    //     return searchAPI.search(page);
    // }
}

export default APIWrapperFactory;

// class RedNoteHotwordAPI {
//     /**
//      * get hot words
//      * @param {number} page -
//      * @returns {Promise<Array<{hotWord: string, noteCount: number, noteLabel: string}>>}
//      */
//     static async getHotWords(page = 1) {
//         if (page < 1 || page > 10) {
//             throw new Error("Invalid page number: only 1-10 supported");
//         }

//         try {
//             const response = await axios.post(
//                 "https://gw.newrank.cn/api/xhsv2/nr/app/xh/v2/rank/hotWordHotList",
//                 {
//                     typeV1: "",
//                     typeV2: "",
//                     rankType: "day",
//                     rankDate: "2025-05-22",
//                     recentType: "",
//                     size: 20,
//                     start: page,
//                     isNew: "",
//                     isBoom: "",
//                     sort: "hot_score",
//                 },
//                 {
//                     headers: {
//                         Accept: "*/*",
//                         "Accept-Language": "en",
//                         Connection: "keep-alive",
//                         Origin: "https://xh.newrank.cn",
//                         Referer: "https://xh.newrank.cn/",
//                         "Sec-Fetch-Dest": "empty",
//                         "Sec-Fetch-Mode": "cors",
//                         "Sec-Fetch-Site": "same-site",
//                         "User-Agent":
//                             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
//                         "content-type": "application/json",
//                         "n-token": "35c430ef650b459ba2b9c1409148d929",
//                         request_id: "a69d1fce8e89445d853fe3afc11024e5",
//                         "sec-ch-ua":
//                             '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
//                         "sec-ch-ua-mobile": "?0",
//                         "sec-ch-ua-platform": '"Windows"',
//                         Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; token=915A087F812E44A79ACE047307BC527E; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%2C%22%24device_id%22%3A%22196f248066721f-092e6c949d0a9b-26011f51-2073600-196f24806684c8%22%7D; auth_n=37ZQoBZfU8kqgB463MGBXe740RNb6EQGr2Gv8n43AUa+BEGCBVWzbG9Ojhtw84j6; acw_tc=1a0c380917479917716373387e007ad3e867390ac1de877603b18bcb26ba19",
//                     },
//                 }
//             );
//             return response.data?.data?.list || [];
//         } catch (error) {
//             throw this.#handleError(error);
//         }
//     }

//     static #handleError(error) {
//         const msg = error.response
//             ? `API error [${error.response.status}]: ${
//                   error.response.data?.message || "Unknown error"
//               }`
//             : `Network error: ${error.message}`;
//         return new Error(msg);
//     }
// }

// class RedNoteTopicAPI {
//     /**
//      * @param {number} page
//      * @returns {Promise<Array<{topicName: string, interactiveCount: number, noteNum: number, topicType: string, topicSecondType: string}>>}
//      */
//     static async getTopicRank(page = 1) {
//         if (page < 1 || page > 10) {
//             throw new Error("Invalid page number: only 1-10 supported");
//         }

//         try {
//             const response = await axios.post(
//                 "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/topicRank",
//                 {
//                     type: "\u5168\u90E8",
//                     topicSecondType: "",
//                     dateType: 3,
//                     rankDate: "2025-04-01",
//                     isBrandTopic: "0",
//                     sort: "interactiveCount",
//                     size: 20,
//                     start: page,
//                 },
//                 {
//                     headers: {
//                         Accept: "*/*",
//                         "Accept-Language": "en",
//                         Connection: "keep-alive",
//                         Origin: "https://xh.newrank.cn",
//                         Referer: "https://xh.newrank.cn/",
//                         "Sec-Fetch-Dest": "empty",
//                         "Sec-Fetch-Mode": "cors",
//                         "Sec-Fetch-Site": "same-site",
//                         "User-Agent":
//                             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
//                         "content-type": "application/json",
//                         "n-token": "35c430ef650b459ba2b9c1409148d929",
//                         request_id: "1c925718ddfb4a2cb377b910074f5ede",
//                         "sec-ch-ua":
//                             '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
//                         "sec-ch-ua-mobile": "?0",
//                         "sec-ch-ua-platform": '"Windows"',
//                         Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; token=915A087F812E44A79ACE047307BC527E; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%2C%22%24device_id%22%3A%22196f248066721f-092e6c949d0a9b-26011f51-2073600-196f24806684c8%22%7D; auth_n=37ZQoBZfU8kqgB463MGBXe740RNb6EQGr2Gv8n43AUa+BEGCBVWzbG9Ojhtw84j6; acw_tc=1a0c380917479917716373387e007ad3e867390ac1de877603b18bcb26ba19",
//                     },
//                 }
//             );

//             return (response.data?.data?.list || []).map((item) => ({
//                 discussAdd: item.discussAdd,
//                 topicName: item.topicName,
//                 interactiveCount: item.interactiveCount,
//                 noteNum: item.noteNum,
//                 viewAdd: item.viewAdd,
//                 topicType: item.topicType,
//                 topicSecondType: item.topicSecondType,
//             }));
//         } catch (error) {
//             throw this.#handleError(error);
//         }
//     }

//     static #handleError(error) {
//         const msg = error.response
//             ? `API error [${error.response.status}]: ${
//                   error.response.data?.message || "Unknown error"
//               }`
//             : `Network error: ${error.message}`;
//         return new Error(msg);
//     }
// }

// class RedNoteCommentAPI {
//     #BASE_URL = "http://47.120.60.92:8080/api/comment";
//     #noteId;
//     #currentCursor = null;
//     #hasMore = true;

//     constructor(noteId) {
//         // if (!Number.isInteger(noteId) || noteId <= 0) {
//         //   throw new Error('Invalid note ID');
//         // }
//         this.#noteId = noteId;
//     }

//     /**
//      * get next page
//      * @returns {Promise<{comments: Array, hasMore: boolean, cursor: number|null}>}
//      */
//     async nextPage() {
//         console.log("next Page 1");
//         if (!this.#hasMore)
//             return { comments: [], hasMore: false, cursor: null };
//         console.log("next Page 2");

//         try {
//             const params = { noteId: this.#noteId, lastCursor: "" };
//             if (this.#currentCursor) params.lastCursor = this.#currentCursor;

//             const response = await axios.get(this.#BASE_URL, { params });
//             console.log(
//                 "next Page 3, resp: \n" + JSON.stringify(response.data)
//             );

//             this.#hasMore = response.data?.has_more ?? false;
//             this.#currentCursor = response.data?.cursor ?? null;

//             return {
//                 comments: response.data?.comments || [],
//                 hasMore: this.#hasMore,
//                 cursor: this.#currentCursor,
//             };
//         } catch (error) {
//             throw this.#handleError(error);
//         }
//     }

//     /**
//      * @param {number} [delay=500] - (ms)
//      */
//     async getAllComments(delay = 500) {
//         const allComments = [];
//         while (this.#hasMore) {
//             const { comments } = await this.nextPage();
//             allComments.push(...comments);
//             await new Promise((resolve) => setTimeout(resolve, delay));
//         }
//         return allComments;
//     }

//     #handleError(error) {
//         const msg = error.response
//             ? `API error [${error.response.status}]: ${
//                   error.response.data?.message || "Unknown error"
//               }`
//             : `Network error: ${error.message}`;
//         return new Error(msg);
//     }
// }

// class RedNoteSearchAPI {
//     #BASE_URL = "http://47.120.60.92:8080/api/search";
//     #MAX_PAGE = 11;
//     #keyword;
//     #sortType = "general";

//     constructor(keyword, sortType = "popularity_descending") {
//         if (!keyword || typeof keyword !== "string") {
//             throw new Error("Invalid search keyword");
//         }
//         this.#keyword = keyword;
//         this.#sortType = sortType;
//     }

//     /**
//      * search
//      * @param {number} page - 1-10
//      */
//     async search(page = 1) {
//         if (page < 1 || page > this.#MAX_PAGE) {
//             throw new Error(`Invalid page number: only 1-${this.#MAX_PAGE}`);
//         }

//         try {
//             const response = await axios.get(this.#BASE_URL, {
//                 params: {
//                     keyword: this.#keyword,
//                     page: page,
//                     sort: this.#sortType,
//                 },
//             });
//             // console.log(" yykai search resp: \n" + JSON.stringify(response.data?.data?.items));

//             return (response.data?.data?.items || []).map((obj) => ({
//                 author: obj?.note?.user?.nickname || "unknown",
//                 collected_count: obj?.note?.collected_count || 0,
//                 shared_count: obj?.note?.shared_count || 0,
//                 liked_count: obj?.note?.liked_count || 0,
//                 comments_count: obj?.note?.comments_count || 0,
//                 id: obj?.note?.id,
//                 title: obj?.note?.title,
//                 desc: obj?.note?.desc || "",
//                 timestamp: obj?.note?.timestamp || 0,
//             }));
//         } catch (error) {
//             throw this.#handleError(error);
//         }
//     }

//     #handleError(error) {
//         let msg = error.message;
//         if (error.response?.status === 429) {
//             msg = "too many requests, try later";
//         }
//         return new Error(`Search failed: ${msg}`);
//     }
// }

// async function getHotWordsExample() {
//     try {
//         const hotWords = await RedNoteHotwordAPI.getHotWords(1);
//         console.log("Get Hot words:", hotWords.slice(0, 3));
//     } catch (error) {
//         console.error("Get Hot words:", error.message);
//     }
// }

// // Get Hot Topic
// async function getTopicRankExample() {
//     try {
//         const topics = await RedNoteTopicAPI.getTopicRank(1);
//         console.log("Hot Topic:", topics.slice(0, 3));
//     } catch (error) {
//         console.error("Get Hot topic failed:", error.message);
//     }
// }

// async function getCommentsExample() {
//     try {
//         const commentAPI = new RedNoteCommentAPI("68134689000000002002b2be");

//         // Get first page
//         const firstPage = await commentAPI.nextPage();
//         console.log("Get First page:", firstPage.comments[0]);

//         // Get all page
//         const allComments = await commentAPI.getAllComments();
//         console.log("Get Total page:", allComments.length);
//     } catch (error) {
//         console.error("Get comment failed:", error.message);
//     }
// }

// async function searchExample() {
//     try {
//         const searchAPI = new RedNoteSearchAPI(
//             "中医调理",
//             "popularity_descending"
//         );

//         // Get first page
//         const firstPage = await searchAPI.search(1);
//         console.log("Get first page:", firstPage[0]);

//         // Get top 3 page.
//         const allResults = [];
//         for (let page = 1; page <= 3; page++) {
//             const results = await searchAPI.search(page);
//             allResults.push(...results);
//         }
//         console.log("Total num:", allResults.length);
//     } catch (error) {
//         console.error("search failed:", error.message);
//     }
// }

// execute examples
// getHotWordsExample();
// getTopicRankExample();
// getCommentsExample();
// searchExample();

async function exampleUsage() {
    const factory = APIWrapperFactory.getInstance();

    try {
        // // Verified
        // const hotWords = await factory.getHotWords(1);
        // console.log('Hot Words:', hotWords.slice(0, 3));
        // console.log('Hot Words:', hotWords.length);

        // Verified
        // const topics = await factory.getTopicRank(1);
        // console.log('Hot Topics:', topics.length);

        // API error
        // const firstPageComments = await factory.getCommentNextPage('681b3279000000002100429c');
        // console.log('First Page Comments:', firstPageComments.comments[0]);

        // //  API error
        // const allComments = await factory.getAllComments('681b3279000000002100429c');
        // console.log('All Comments:', allComments.length);

        // //  API error
        // const searchResults = await factory.search('美食', 'popularity_descending', 1);
        // const searchResults = await factory.search('中医调理',1);
        // const obj = { route: "hot_topics", params: { page: "2" } };
        // const obj = { route: "notes_comment_by_next_page", params: { noteId: "681b3279000000002100429c" } };
        // userId=66896ebc000000000303084b
        // const obj = {
        //     route: "get_user",
        //     params: { userId: "58e6693382ec392748251566" },
        // };
        const obj = {
            route: "get_note_list",
            params: { userId: "5d526ee0000000001200e485" },
        };
        const noteSet = new Set();

        while (true) {
            const searchResults = await APIWrapperFactory.executeRequest(
                obj,
                "22244"
            );
            for (const item of searchResults) {
                noteSet.add(item.note_id);
                // console.log("item: ", item);
            }
            console.log(
                " yykai searchResults get user res size: ",
                noteSet.size
            );
            if (!searchResults) {
                break;
            }
        }
        // console.log('Search Results:', searchResults);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// exampleUsage();
