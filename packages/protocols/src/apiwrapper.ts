import axios from "axios";
import ExcelJS from "exceljs";

import jsonata from "jsonata";
import { JSONPath } from "jsonpath-plus";
import { type Memory } from "@data3os/agentcontext";
import { IntentionHandler } from "./intention";
import { updateCacheText } from "./filehelper";
import fs from "fs";
import path from "path";

class APIWrapperFactory {
    private static instance: APIWrapperFactory;
    private static cursorMap = new Map<string, any>();

    private constructor() { }

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
        runtime: any,
        obj: any,
        message: Memory
    ): Promise<any | undefined> {
        // {"route": "notes_search","params": {"key1": "v1","key2": "v2"}}
        console.log(`executeRequest params: ${JSON.stringify(obj)}`);
        const taskId = message.content.intention?.taskId || "";
        const totalItemCount =
            obj?.params?.totalItemCount || obj?.request_count || 500;
        let result = [];
        let lastResultLength = -1;
        let resuntNotUpdateNumber = 0;
        let response;
        let route = obj.route || obj.data_action;
        switch (route) {
            case "get_user":
                console.log(`get_user params: ${JSON.stringify(obj)}`);
                const userId = obj?.params?.userId;
                // http://47.120.60.92:8080/api/userInfo?userId=66896ebc000000000303084b
                try {
                    const urlUserInfo1 = {
                        method: "GET",
                        url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user/v3",
                        params: {
                            userId: userId,
                        },
                        headers: {
                            "x-rapidapi-key":
                                "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                            "x-rapidapi-host":
                                "xiaohongshu-all-api.p.rapidapi.com",
                        },
                    };
                    console.log(`urlUserInfo1 with params: ${urlUserInfo1}`);
                    response = await axios.request(urlUserInfo1);
                    if (response.data?.code != 0) {
                        const urlUserInfo2 = `http://47.120.60.92:8080/api/userInfo?userId=${userId}`;
                        console.log(
                            `urlUserInfo2 with params: ${urlUserInfo2}`
                        );
                        response = await axios.get(urlUserInfo2);
                    }

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
                        userid,
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
                    const userprofile = {
                        desc,
                        fans,
                        follows,
                        genderStr,
                        id: id || userid,
                        ip_location,
                        location,
                        nickname,
                        note_count: notes,
                        tags,
                    };
                    // const {result, csvfileurl}
                    result = [userprofile];
                    // return userprofile;
                } catch (error) {
                    console.error("Failed to fetch user info:", error.message);
                    return "Feach data error, msg: " + error.msg;
                }
                break;
            case "hot_words":
                try {
                    console.log(
                        "Fetching hot words... totalItemCount: " +
                        totalItemCount
                    );
                    for (
                        let page = 1;
                        page <= 10 && result.length < totalItemCount;
                        page++
                    ) {
                        if (result.length == lastResultLength) {
                            console.warn("no more data, this time");
                            resuntNotUpdateNumber++;
                            if (resuntNotUpdateNumber >= 5) {
                                console.log("no more data");
                                break;
                            }
                        } else {
                            resuntNotUpdateNumber = 0;
                        }
                        lastResultLength = result.length;
                        try {
                            response = await axios.post(
                                "https://gw.newrank.cn/api/xhsv2/nr/app/xh/v2/rank/hotWordHotList",
                                {
                                    typeV1: "",
                                    typeV2: "",
                                    rankType: "day",
                                    rankDate: getHotDate() || "2025-06-07",
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
                                        "Accept-Language":
                                            "zh-CN,zh;q=0.9,en;q=0.8",
                                        Connection: "keep-alive",
                                        Origin: "https://xh.newrank.cn",
                                        Referer: "https://xh.newrank.cn/",
                                        "Sec-Fetch-Dest": "empty",
                                        "Sec-Fetch-Mode": "cors",
                                        "Sec-Fetch-Site": "same-site",
                                        "User-Agent":
                                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                                        "content-type": "application/json",
                                        "n-token":
                                            "35c430ef650b459ba2b9c1409148d929",
                                        request_id:
                                            "c223bbc2a76140a7818271ea7abf1246",
                                        "sec-ch-ua":
                                            '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                                        "sec-ch-ua-mobile": "?0",
                                        "sec-ch-ua-platform": '"Windows"',
                                        Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; token=183E6D980ED848C7B8C939C2C66B0C1C; acw_tc=0a472f8317494476720786894e005821b1dc5e91c7ecca2f5be57a5affb102; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%2C%22%24device_id%22%3A%22196f248066721f-092e6c949d0a9b-26011f51-2073600-196f24806684c8%22%7D; auth_n=nNCldQK3Tdo4VBUZKOgQA9/QaFEzTDkUxVtzG4nSdcCLR2QbtXf8z/4qRrRJcDBz",
                                    },
                                }
                            );
                        } catch (error) {
                            console.error(
                                "Failed to fetch hot words:",
                                error.message
                            );
                            continue;
                        }
                        const tempresult = (
                            response.data?.data?.list || []
                        ).map((item) => ({
                            hotWord: item.hotWord || "",
                            rankDate: item.rankDate || "",
                            noteCount: item.noteCount || 0,
                            dayCount: item.dayCount || 0,
                        }));
                        result = result.concat(tempresult);
                        console.log("Fetched hot words len: " + result.length);
                    }

                    console.log(
                        "Fetched hot words: " +
                        JSON.stringify(result).slice(0, 100)
                    );
                } catch (error) {
                    console.error("Failed to fetch hot words:", error.message);
                    result = [];
                }
                break;
            case "hot_topics":
                try {
                    console.log(
                        "Fetching hot topics... totalItemCount: " +
                        totalItemCount
                    );
                    for (
                        let page = 1;
                        page <= 10 && result.length < totalItemCount;
                        page++
                    ) {
                        if (result.length == lastResultLength) {
                            console.warn("no more data, this time");
                            resuntNotUpdateNumber++;
                            if (resuntNotUpdateNumber >= 5) {
                                console.log("no more data");
                                break;
                            }
                        } else {
                            resuntNotUpdateNumber = 0;
                        }
                        lastResultLength = result.length;
                        try {
                            response = await axios.post(
                                "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/topicRank",
                                {
                                    type: "\u5168\u90E8",
                                    topicSecondType: "",
                                    dateType: 1,
                                    rankDate: getHotDate() || "2025-06-07",
                                    isBrandTopic: "0",
                                    sort: "interactiveCount",
                                    size: 20,
                                    start: page,
                                },
                                {
                                    headers: {
                                        Accept: "*/*",
                                        "Accept-Language":
                                            "zh-CN,zh;q=0.9,en;q=0.8",
                                        Connection: "keep-alive",
                                        Origin: "https://xh.newrank.cn",
                                        Referer: "https://xh.newrank.cn/",
                                        "Sec-Fetch-Dest": "empty",
                                        "Sec-Fetch-Mode": "cors",
                                        "Sec-Fetch-Site": "same-site",
                                        "User-Agent":
                                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                                        "content-type": "application/json",
                                        "n-token":
                                            "35c430ef650b459ba2b9c1409148d929",
                                        request_id:
                                            "c223bbc2a76140a7818271ea7abf1246",
                                        "sec-ch-ua":
                                            '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                                        "sec-ch-ua-mobile": "?0",
                                        "sec-ch-ua-platform": '"Windows"',
                                        Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; token=183E6D980ED848C7B8C939C2C66B0C1C; acw_tc=0a472f8317494476720786894e005821b1dc5e91c7ecca2f5be57a5affb102; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%2C%22%24device_id%22%3A%22196f248066721f-092e6c949d0a9b-26011f51-2073600-196f24806684c8%22%7D; auth_n=nNCldQK3Tdo4VBUZKOgQA9/QaFEzTDkUxVtzG4nSdcCLR2QbtXf8z/4qRrRJcDBz",
                                    },
                                }
                            );
                        } catch (error) {
                            console.error(
                                "Failed to fetch hot topics:",
                                error.message
                            );
                            continue;
                        }

                        const tempresult = (
                            response.data?.data?.list || []
                        ).map((item) => ({
                            discussAdd: item.discussAdd,
                            topicName: item.topicName,
                            interactiveCount: item.interactiveCount,
                            noteNum: item.noteNum,
                            viewAdd: item.viewAdd,
                            topicType: item.topicType,
                            topicSecondType: item.topicSecondType,
                        }));
                        result = result.concat(tempresult);
                        console.log("Fetched hot words, len: " + result.length);
                    }
                    console.log(
                        "my result Fetched hot topics: " +
                        JSON.stringify(result).slice(0, 100)
                    );
                } catch (error) {
                    console.log("Error fetching hot topics:", error.message);
                    result = [];
                }
                break;
            case "notes_comment_by_next_page":
                for (
                    let i = 0;
                    result.length < 500 && result.length < totalItemCount;
                    i++
                ) {
                    if (result.length == lastResultLength) {
                        console.warn("no more data, this time");
                        resuntNotUpdateNumber++;
                        if (resuntNotUpdateNumber >= 5) {
                            console.log("no more data");
                            break;
                        }
                    } else {
                        resuntNotUpdateNumber = 0;
                    }
                    lastResultLength = result.length;
                    let tempResult = [];
                    const lastCursor =
                        APIWrapperFactory.cursorMap.get(taskId) || "";
                    if (lastCursor === "blank_holder") {
                        console.log(
                            `executeRequest lastCursor is blank_holder`
                        );
                        APIWrapperFactory.cursorMap.set(taskId, "");
                        break;
                    }

                    const options = {
                        method: "GET",
                        url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-note-comment/v2",
                        params: {
                            noteId: obj?.params?.noteId,
                            lastCursor: lastCursor,
                        },
                        headers: {
                            "x-rapidapi-key":
                                "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                            "x-rapidapi-host":
                                "xiaohongshu-all-api.p.rapidapi.com",
                        },
                    };
                    try {
                        response = await axios.request(options);
                        if (response.data?.code != 0) {
                            const urlWithparams = `http://47.120.60.92:8080/api/comment?noteId=${obj?.params?.noteId}&lastCursor=${lastCursor}`;
                            console.log(
                                `executeRequest urlWithparams: ${urlWithparams}`
                            );
                            response = await axios.get(urlWithparams);
                            // http://47.120.60.92:8080/api/comment?noteId=682eb2aa0000000021005a6d&lastCursor=
                        }
                    } catch (error) {
                        console.log(`executeRequest error: ${error.message}`);
                        continue;
                    }
                    console.log(
                        `executeRequest response: ${JSON.stringify(
                            response.data
                        ).slice(0, 220)}`
                    );
                    const cursor = response.data?.data?.cursor;
                    if (cursor !== undefined) {
                        try {
                            obj = JSON.parse(cursor) || {};
                        } catch (error) {
                            if (cursor) {
                                obj.cursor = cursor;
                            }
                            console.error(
                                "Failed to parse cursor:",
                                error.message
                            );
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
                                        ip_location:
                                            subComment?.ip_location || "",
                                        time: subComment?.time || "",
                                        username:
                                            subComment?.user?.nickname || "",
                                    }));
                            }

                            return filteredComment;
                        });
                    }

                    // const comments = filterComments(
                    // response.data?.data?.comments || []
                    // );

                    tempResult = filterComments(
                        response.data?.data?.comments || []
                    );
                    result = result.concat(tempResult);
                    console.log(
                        `executeRequest result change len: ${result.length}`
                    );
                }
                console.log(
                    `executeRequest result after len: ${result.length}`
                );
                break;

            case "get_note_list":
                {
                    for (let i = 0; i < 4; i++) {
                        if (result.length == lastResultLength) {
                            console.warn("no more data, this time");
                            resuntNotUpdateNumber++;
                            if (resuntNotUpdateNumber >= 5) {
                                console.log("no more data");
                                break;
                            }
                        } else {
                            resuntNotUpdateNumber = 0;
                        }
                        lastResultLength = result.length;
                        const note_curosr_key = "get_note_list_" + taskId;
                        const lastCursor =
                            APIWrapperFactory.cursorMap.get(note_curosr_key) ||
                            "";
                        if (lastCursor === "blank_holder") {
                            console.log(
                                `executeRequest lastCursor is blank_holder`
                            );
                            APIWrapperFactory.cursorMap.set(
                                note_curosr_key,
                                ""
                            );
                            break;
                        }
                        try {
                            const options = {
                                method: "GET",
                                url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user-note-list/v1",
                                params: {
                                    userId: obj?.params?.userId,
                                    lastCursor: lastCursor,
                                },
                                headers: {
                                    "x-rapidapi-key":
                                        "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    "x-rapidapi-host":
                                        "xiaohongshu-all-api.p.rapidapi.com",
                                },
                            };
                            response = await axios.request(options);
                            if (response.data?.code != 0) {
                                const urlWithparams = `http://47.120.60.92:8080/api/noteList?userId=${obj?.params?.userId}&lastCursor=${lastCursor}`;
                                console.log(
                                    `executeRequest urlWithparams: ${urlWithparams}`
                                );
                                response = await axios.get(urlWithparams);
                            }
                        } catch (error) {
                            console.log(
                                `executeRequest error: ${error.message}`
                            );
                            continue;
                        }
                        // http://47.120.60.92:8080/api/noteList?userId=66896ebc000000000303084b&lastCursor=
                        console.log(
                            `executeRequest get_note_list response: ${JSON.stringify(
                                response.data
                            ).slice(0, 100)}`
                        );
                        let lastestCursor = null;

                        function filterNotes(notes) {
                            return notes.map((note) => {
                                lastestCursor = note?.cursor;
                                // console.log(`executeRequest note: ${JSON.stringify(note)}`);
                                const filteredNote = {
                                    share_count: note?.share_count || "",
                                    title: note?.title || "",
                                    linkes_count: note?.likes || "",
                                    collected_count:
                                        note?.collected_count || "",
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

                        const tempResult = filterNotes(
                            response.data?.data?.notes || []
                        );
                        console.log(
                            `executeRequest get_note_list tempResult size: ${tempResult.length}`
                        );
                        result = result.concat(tempResult);
                        console.log(
                            `executeRequest get_note_list result size: ${result.length}`
                        );

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
                    }
                    console.log(`executeRequest result size: ${result.length}`);
                }

                break;

            case "notes_search":
                try {
                    const keyword =
                        obj?.params?.keyword ||
                        obj?.params?.keywords ||
                        obj?.params?.key1 ||
                        obj?.params?.product ||
                        obj?.params?.query ||
                        obj?.keyword ||
                        obj?.keywords ||
                        obj?.key1 ||
                        obj?.product ||
                        obj?.query ||
                        "";
                    const page = obj?.params?.page || 1;
                    // Get more data.
                    // page 1: get data from 1 to 5.
                    // page 2: get data from 6 to 10.
                    // const pageStart = (page - 1) * 5 + 1;
                    // const pageEnd = page * 5;
                    let extractPath: string = null,
                        filterPath: string = null;
                    const maxPageNum = 300;
                    for (
                        let mPage = 1;
                        mPage <= maxPageNum && result.length < totalItemCount;
                        mPage++
                    ) {
                        if (result.length == lastResultLength) {
                            console.warn("no more data, this time");
                            extractPath = null;
                            filterPath = null;
                            resuntNotUpdateNumber++;
                            if (resuntNotUpdateNumber >= 5) {
                                console.log("no more data");
                                break;
                            }
                        } else {
                            resuntNotUpdateNumber = 0;
                        }
                        lastResultLength = result.length;
                        let tempResult = [];
                        const sort =
                            obj?.params?.sort || "popularity_descending";
                        // popularity_descending :(Hot) , time_descending :(New)
                        try {
                            response = await axios.get(
                                "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-note/v2",
                                {
                                    params: {
                                        keyword: keyword,
                                        page: mPage,
                                        sort: sort,
                                        noteType: "_0",
                                    },
                                    headers: {
                                        "x-rapidapi-host":
                                            "xiaohongshu-all-api.p.rapidapi.com",
                                        "x-rapidapi-key":
                                            "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    },
                                }
                            );
                        } catch (error) {
                            console.log(
                                `note_search get url 1 `,
                                error.message
                            );
                        }
                        try {
                            if (response?.data?.code != 0) {
                                const url1 = `http://47.117.133.51:30015/api/xiaohongshu/search-note/v2?token=QdQU3VTR&keyword=${keyword}&page=${mPage}&sort=${sort}&noteType=_0&noteTime`;
                                console.log(
                                    `executeRequest url by params: ${url1}`
                                );
                                response = await axios.get(url1);
                            }
                        } catch (error) {
                            console.log(
                                `note_search get url 2 `,
                                error.message
                            );
                        }

                        try {
                            if (response?.data?.code != 0) {
                                const url2 = `http://47.120.60.92:8080/api/search?keyword=${keyword}&page=${mPage}&sort=${sort}`;
                                console.log(
                                    `executeRequest url by params: ${url2}`
                                );
                                response = await axios.get(url2);
                            }
                            console.log(
                                `executeRequest response: ${JSON.stringify(
                                    response.data
                                ).slice(0, 300)}`
                            );

                            console.log(
                                `executeRequest response.data.data.items: ${response?.data?.data?.items?.length}`
                            );
                            if (response?.data?.data?.items?.length == 0) {
                                break; // You have already turned the last page. Don't turn the pages back any further.
                            }
                        } catch (e) {
                            console.error("note_search get url 3 ", e.message);
                            continue;
                        }
                        if (response?.data?.code != 0) {
                            console.error("note_search continue to next loop");
                            continue;
                        }
                        const items = response.data?.data?.items;
                        if (!items || items.length == 0) {
                            continue;
                        }

                        /*tempResult = (response.data?.data?.items || []).map(
                            (obj) => ({
                                author: obj?.note?.user?.nickname || "unknown",
                                collected_count:
                                    obj?.note?.collected_count || 0,
                                shared_count: obj?.note?.shared_count || 0,
                                liked_count: obj?.note?.liked_count || 0,
                                comments_count: obj?.note?.comments_count || 0,
                                id: obj?.note?.id,
                                title: obj?.note?.title,
                                desc: obj?.note?.desc || "",
                                timestamp: obj?.note?.timestamp || 0,
                            })
                        ); */
                        // if (extractPath === null || filterPath === null) {
                        //     const items = response.data?.data?.items;
                        //     if (items && items.length > 0) {
                        //         const mapper =
                        //             await IntentionHandler.genExtractorByJsonata(
                        //                 runtime,
                        //                 message,
                        //                 items[0]
                        //             );
                        //         console.log(mapper);
                        //         extractPath = mapper.extract;
                        //         filterPath = mapper.filter;
                        //     }
                        // }
                        if (!filterPath) {
                            filterPath = await IntentionHandler.genAIFilterPath(runtime, message, items[0]);
                        }
                        if (!extractPath) {
                            extractPath = await IntentionHandler.genAIExtraPath(runtime, message, items[0]);
                        }
                        try {

                            console.log("notes_search...1...before JSONPath len: " + items.length);
                            const rresults = response.data?.data?.items;
                            for (let i = 0; i < rresults.length; i++) {
                                const note = rresults[i].note;
                                if(!note) {
                                    continue;
                                }
                                const { liked_count, shared_count, comments_count, collected_count } = note;
                                console.log(`liked_count: ${liked_count}, shared_count: ${shared_count}, comments_count: ${comments_count}, collected_count: ${collected_count}`);
                            }
                            // console.log(`\nnotes_search...2...----------------------------------\nrresults ${JSON.stringify(rresults)} \n------------------------------------`);

                            tempResult = JSONPath({
                                path: filterPath,
                                json: response.data?.data?.items,
                            }) || [];
                            console.log("notes_search...3...after JSONPath len: " + tempResult.length);
                            //tempResult = tempResult.map(item => {
                            //    return eval(extractPath);
                            //});
                            //const extractFunc = new Function(
                            //    "item",
                            //    "return " + extractPath
                            //);
                            //tempResult = tempResult.map((item) =>
                            //    extractFunc(item)
                            //);
                            if (!tempResult || tempResult.length == 0) {
                                continue;
                            }
                            const expression = jsonata(extractPath);
                            console.log("notes_search...4...after JSONATA len: " + tempResult.length);
                            tempResult = await expression.evaluate(tempResult) || [];
                            console.log("notes_search...5...after evaluate len: " + tempResult.length);
                        }
                        catch (err) {
                            console.log(err);
                            tempResult = (response.data?.data?.items || []).map(
                                (obj) => ({
                                    author: obj?.note?.user?.nickname || "unknown",
                                    collected_count:
                                        obj?.note?.collected_count || 0,
                                    shared_count: obj?.note?.shared_count || 0,
                                    liked_count: obj?.note?.liked_count || 0,
                                    comments_count: obj?.note?.comments_count || 0,
                                    id: obj?.note?.id,
                                    title: obj?.note?.title,
                                    desc: obj?.note?.desc || "",
                                    timestamp: obj?.note?.timestamp || 0,
                                })
                            );
                        }
                        console.log(
                            `${JSON.stringify(
                                tempResult
                            )}\n------------------------jsonata---------------------\n`
                        );
                        result = result.concat(tempResult);
                        console.log(`executeRequest result: ${result.length}`);
                    }
                    result?.slice(0, totalItemCount);
                    console.log(
                        `executeRequest result, after cut.: ${result?.length}`
                    );
                } catch (error) {
                    console.error("Error fetching data:", error.message);
                }
                break;
            case "fetch_comments_by_keyword":
                try {
                    const keyword =
                        obj?.params?.keyword ||
                        obj?.params?.keywords ||
                        obj?.params?.key1 ||
                        obj?.params?.product ||
                        obj?.params?.query ||
                        obj?.keyword ||
                        obj?.keywords ||
                        obj?.key1 ||
                        obj?.product ||
                        obj?.query ||
                        "";
                    // totalItemCount
                    const maxPageNum = 300;

                    async function getNoteIds(
                        keyword,
                        page = 1,
                        sort = "general",
                        noteType = "_0",
                        noteTime = "一天内"
                    ) {
                        try {
                            const options = {
                                method: "GET",
                                url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-note/v2",
                                params: {
                                    keyword,
                                    page: page.toString(),
                                    sort,
                                    noteType,
                                    noteTime,
                                },
                                headers: {
                                    "x-rapidapi-key":
                                        "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    "x-rapidapi-host":
                                        "xiaohongshu-all-api.p.rapidapi.com",
                                },
                            };
                            const response = await axios.request(options);
                            const items = response.data?.data?.items;
                            return items
                                .map((item) => item?.note?.id)
                                .filter(Boolean);
                        } catch (error) {
                            console.error(`note search failed: ${error}`);
                            return [];
                        }
                    }

                    async function getComments(noteId) {
                        try {
                            const options = {
                                method: "GET",
                                url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-note-comment/v2",
                                params: { noteId },
                                headers: {
                                    "x-rapidapi-key":
                                        "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    "x-rapidapi-host":
                                        "xiaohongshu-all-api.p.rapidapi.com",
                                },
                            };
                            const response = await axios.request(options);
                            return response.data.data.comments || [];
                        } catch (error) {
                            console.error(
                                `Get comments failed (noteId:${noteId}): ${error}`
                            );
                            return [];
                        }
                    }

                    async function getCommentsByKeyword(
                        keyword = "热门",
                        totalItemCount = 100
                    ) {
                        let page = 1;
                        let allComments = [];
                        while (
                            allComments.length < totalItemCount &&
                            page <= 10
                        ) {
                            if (result.length == lastResultLength) {
                                console.warn("no more data, this time");
                                resuntNotUpdateNumber++;
                                if (resuntNotUpdateNumber >= 5) {
                                    console.log("no more data");
                                    break;
                                }
                            } else {
                                resuntNotUpdateNumber = 0;
                            }
                            lastResultLength = result.length;
                            const noteIds = await getNoteIds(keyword, page);
                            if (noteIds.length === 0) {
                                console.log("no more notes");
                                break;
                            }

                            for (const noteId of noteIds) {
                                const comments = await getComments(noteId);
                                allComments = [...allComments, ...comments];

                                if (allComments.length >= totalItemCount) {
                                    allComments = allComments.slice(
                                        0,
                                        totalItemCount
                                    );
                                    console.log(
                                        `success fetching ${allComments.length} comments`
                                    );
                                    return allComments;
                                }
                            }
                            page++;
                            await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                            );
                        }
                        console.log(
                            `Get ${allComments.length} comments (less than ${totalItemCount})`
                        );
                        return allComments;
                    }
                    const tempResult = await getCommentsByKeyword(
                        keyword,
                        totalItemCount
                    );

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
                                        ip_location:
                                            subComment?.ip_location || "",
                                        time: subComment?.time || "",
                                        username:
                                            subComment?.user?.nickname || "",
                                    }));
                            }

                            return filteredComment;
                        });
                    }

                    // const comments = filterComments(
                    // response.data?.data?.comments || []
                    // );

                    result = filterComments(tempResult || []);
                    result?.slice(0, totalItemCount);
                    console.log(
                        `executeRequest result, after cut.: ${result?.length}`
                    );
                } catch (error) {
                    console.error("Error fetching data:", error.message);
                }
                break;
            case "fetch_notes_and_comments_by_keyword":
                let tempResultComments = [];
                let tempResultNotes = [];
                try {
                    const keyword =
                        obj?.params?.keyword ||
                        obj?.params?.keywords ||
                        obj?.params?.key1 ||
                        obj?.params?.product ||
                        obj?.params?.query ||
                        obj?.keyword ||
                        obj?.keywords ||
                        obj?.key1 ||
                        obj?.product ||
                        obj?.query ||
                        "";
                    const totalCommentCount = obj?.params?.totalCommentCount || totalItemCount * 3;
                    // totalItemCount
                    const maxPageNum = 300;
                    // let tempResultComments = [];

                    async function getNoteIds(
                        keyword,
                        page = 1,
                        sort = "general",
                        noteType = "_0",
                        noteTime = "一天内"
                    ) {
                        try {
                            const options = {
                                method: "GET",
                                url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-note/v2",
                                params: {
                                    keyword,
                                    page: page.toString(),
                                    sort,
                                    noteType,
                                    noteTime,
                                },
                                headers: {
                                    "x-rapidapi-key":
                                        "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    "x-rapidapi-host":
                                        "xiaohongshu-all-api.p.rapidapi.com",
                                },
                            };
                            const response = await axios.request(options);
                            const items = response.data?.data?.items;
                            tempResultNotes = tempResultNotes.concat(items);
                            return items
                                .map((item) => item?.note?.id)
                                .filter(Boolean);
                        } catch (error) {
                            console.error(`note search failed: ${error}`);
                            return [];
                        }
                    }

                    async function getComments(noteId) {
                        try {
                            const options = {
                                method: "GET",
                                url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-note-comment/v2",
                                params: { noteId },
                                headers: {
                                    "x-rapidapi-key":
                                        "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                    "x-rapidapi-host":
                                        "xiaohongshu-all-api.p.rapidapi.com",
                                },
                            };
                            const response = await axios.request(options);
                            return response.data.data.comments || [];
                        } catch (error) {
                            console.error(
                                `Get comments failed (noteId:${noteId}): ${error}`
                            );
                            return [];
                        }
                    }

                    async function getCommentsByKeyword(keyword = "热门") {
                        let page = 1;
                        let allComments = [];
                        while (
                            (tempResultNotes.length < totalItemCount || allComments.length < totalCommentCount) &&
                            page <= maxPageNum
                        ) {
                            if (tempResultNotes.length == lastResultLength) {
                                console.warn("no more data, this time");
                                resuntNotUpdateNumber++;
                                if (resuntNotUpdateNumber >= 5) {
                                    console.log("no more data");
                                    break;
                                }
                            } else {
                                resuntNotUpdateNumber = 0;
                            }
                            lastResultLength = tempResultNotes.length;
                            const noteIds = await getNoteIds(keyword, page);
                            if (noteIds.length === 0) {
                                console.log("no more notes");
                                break;
                            }

                            for (const noteId of noteIds) {
                                const comments = await getComments(noteId);
                                allComments = [...allComments, ...comments];

                                if (allComments.length >= totalItemCount) {
                                    allComments = allComments.slice(
                                        0,
                                        totalItemCount
                                    );
                                    console.log(
                                        `success fetching ${allComments.length} comments`
                                    );
                                    return allComments;
                                }
                            }
                            page++;
                            await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                            );
                        }
                        console.log(
                            `Get ${allComments.length} comments (less than ${totalItemCount})`
                        );
                        return allComments;
                    }
                    tempResultComments = await getCommentsByKeyword(keyword);

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
                                        ip_location:
                                            subComment?.ip_location || "",
                                        time: subComment?.time || "",
                                        username:
                                            subComment?.user?.nickname || "",
                                    }));
                            }

                            return filteredComment;
                        });
                    }

                    // const comments = filterComments(
                    // response.data?.data?.comments || []
                    // );

                    tempResultNotes = (tempResultNotes || []).map((obj) => ({
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

                    tempResultComments = filterComments(
                        tempResultComments || []
                    );
                    tempResultComments = tempResultComments.slice(
                        0,
                        totalCommentCount
                    );
                    tempResultNotes = tempResultNotes.slice(0, totalItemCount);
                    console.log(
                        `executeRequest result, tempResultNotes after cut.: ${tempResultNotes?.length}`
                    );
                } catch (error) {
                    console.error("Error fetching data:", error.message);
                }
                let txtfilename1;
                let excelfilename1;
                if (tempResultComments?.length > 0) {
                    const {
                        firstUnExistsTxtFilename,
                        firstUnExistsExcelFilename,
                    } = APIWrapperFactory.excelDataPersist(
                        tempResultComments,
                        taskId + "_comments_"
                    );
                    txtfilename1 = firstUnExistsTxtFilename;
                    excelfilename1 = firstUnExistsExcelFilename;
                }
                console.log(
                    `executeRequest comments len: ${tempResultComments.length}`
                );
                console.log(
                    `executeRequest txtfilename: ${txtfilename1} ,  excelfilename: ${excelfilename1} `
                );
                let txtfilename2;
                let excelfilename2;
                if (tempResultNotes?.length > 0) {
                    const {
                        firstUnExistsTxtFilename,
                        firstUnExistsExcelFilename,
                    } = APIWrapperFactory.excelDataPersist(
                        tempResultNotes,
                        taskId + "_notes_"
                    );
                    txtfilename2 = firstUnExistsTxtFilename;
                    excelfilename2 = firstUnExistsExcelFilename;
                }
                console.log(
                    `executeRequest notes len: ${tempResultNotes.length}`
                );
                console.log(
                    `executeRequest txtfilename: ${txtfilename2} ,  excelfilename: ${excelfilename2} `
                );
                // const {result, txtfilename, excelfilename} = await APIWrapperFactory.executeRequest(
                const txtfilename = [txtfilename1, txtfilename2];
                const excelfilename = [excelfilename1, excelfilename2];
                result = result.concat(tempResultNotes);
                result = result.concat(tempResultComments);
                // console.log("return before: " + (JSON.stringify( { result, txtfilename, excelfilename }) ) );
                return { result, txtfilename, excelfilename };

            case "users_search":
                try {
                    const keyword =
                        obj?.params?.keyword ||
                        obj?.params?.keywords ||
                        obj?.params?.key1 ||
                        obj?.params?.product ||
                        obj?.params?.query ||
                        obj?.keyword ||
                        obj?.keywords ||
                        obj?.key1 ||
                        obj?.product ||
                        obj?.query ||
                        "";
                    const maxPageNum = 5;
                    for (
                        let mPage = 1;
                        mPage <= maxPageNum && result.length < totalItemCount;
                        mPage++
                    ) {
                        if (result.length == lastResultLength) {
                            console.warn("no more data, this time");
                            resuntNotUpdateNumber++;
                            if (resuntNotUpdateNumber >= 5) {
                                console.log("no more data");
                                break;
                            }
                        } else {
                            resuntNotUpdateNumber = 0;
                        }
                        lastResultLength = result.length;
                        let tempResult = [];
                        const options = {
                            method: "GET",
                            url: "https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-user/v2",
                            params: {
                                keyword: keyword,
                                page: mPage,
                            },
                            headers: {
                                "x-rapidapi-key":
                                    "010987dba4mshacddc04aa8d0269p1136ddjsnfb7887207281",
                                "x-rapidapi-host":
                                    "xiaohongshu-all-api.p.rapidapi.com",
                            },
                        };
                        try {
                            const response = await axios.request(options);
                            /** User JSON structure:
     * {
  id: '675a82e8000000001d02fc4d',
  name: 'kazoo美妆',
  desc: '美妆护肤 | 笔记·1801 | 粉丝·3.9万',
  red_official_verified: true, 
  sub_title: '小红书号：11535754580',
  image: 'https://sns-avatar-qc.xhscdn.com/avatar/2e247c05-14cc-3596-87d1-bc332d6eb21f?imageView2/2/w/360/format/webp',
  red_official_verified: true, 
  live: {
    has_goods: false,
    room_id: '569783074295376937',
  },
}   */
                            tempResult = response.data?.data?.users
                                .filter((user) => user != null)
                                .map((user) => ({
                                    user_id: user.id,
                                    user_name: user.name,
                                    user_desc: user.desc,
                                    official_verified:
                                        user.red_official_verified,
                                    user_sub_title: user.sub_title,
                                    user_avatar: user.image,
                                    live_room_id: user.live?.room_id,
                                    live_has_goods: user.live?.has_goods,
                                }));
                            // Test log case:
                            console.log("tempResult[0]: ", tempResult[0]);
                            // console.log('users len:', response.data.data.users.length);
                            // console.log("results: ", results[0]);
                        } catch (error) {
                            console.error(error);
                            continue;
                        }
                        result = result.concat(tempResult);
                        console.log(`executeRequest result: ${result.length}`);
                    }
                    result?.slice(0, totalItemCount);
                    console.log(
                        `executeRequest user search result, after cut.: ${result?.length}`
                    );
                } catch (error) {
                    console.error(
                        "Error user search fetching data:",
                        error.message
                    );
                }
                break;
            default:
                console.error(`Unknown route: ${JSON.stringify(obj)}`);
        }
        // console.log(`executeRequest result: ${JSON.stringify(result)}`);
        // const csvRes = await APIWrapperFactory.convertToCSV(result);
        let csvfileurl = "";
        let txtfilename;
        let excelfilename;
        if (result?.length > 0) {
            const { firstUnExistsTxtFilename, firstUnExistsExcelFilename } =
                APIWrapperFactory.excelDataPersist(result, taskId);
            txtfilename = firstUnExistsTxtFilename;
            excelfilename = firstUnExistsExcelFilename;
        }
        console.log(`executeRequest result len: ${result.length}`);
        console.log(`executeRequest csvfileurl: ${csvfileurl}`);
        return { result, txtfilename, excelfilename };
    }

    public static excelDataPersist(result: any, taskId: any) {
        const responceStr = "";
        let firstUnExistsTxtFilename = "";
        let firstUnExistsExcelFilename = "";

        let filePath;
        for (let i = 1; i <= 10; i++) {
            const excelfilename = taskId + `_raw_data${i}.xlsx`;
            const txtfilename = taskId + `_raw_data${i}.txt`;
            // const filename = 'abc.pdf'; // Test: can also download pdf.
            filePath = path.join(
                process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
                "files",
                excelfilename
            );
            if (!fs.existsSync(filePath)) {
                firstUnExistsTxtFilename = txtfilename;
                firstUnExistsExcelFilename = excelfilename;
                break;
            }
        }
        this.exportToExcel(result, filePath);
        const responseFinal = this.convertToCSV(result);
        updateCacheText(responseFinal, firstUnExistsTxtFilename, (err) => {
            console.error("Failed to write file:", err);
        });
        //         return `\n\n数据下载: 
        // \n1. 文本 txt 数据，方便把 URL 复制到 AI 中进行分析。
        //     \nhttps://data3.site/media/files/${firstUnExistsTxtFilename}
        // \n2. excel 数据，格式优美，方便阅读。
        //     \nhttps://data3.site/media/files/${firstUnExistsExcelFilename}`;
        return { firstUnExistsTxtFilename, firstUnExistsExcelFilename };
        //return `http://97.64.21.158:3333/media/files/${firstUnExistsFilename}`;
    }

    public static exportToExcel(data, filePath) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Data");
            const headers = Object.keys(data[0]);
            worksheet.columns = headers.map((header) => ({
                header,
                key: header,
                width: 20,
            }));
            data.forEach((item) => {
                if (typeof item === "object" && item !== null) {
                    worksheet.addRow(item);
                }
            });
            workbook.xlsx.writeFile(filePath);
            console.log(`Excel save to: ${filePath}`);
        } catch (e) {
            console.log("exportToExcel error: ", e.message);
        }
    }

    public static convertToCSV(data) {
        const fields = null;
        const delimiter = ",";
        const includeHeader = true;
        try {
            if (Array.isArray(data) && typeof data[0] === "string") {
                data = data.map((item) => {
                    let parsed;
                    try {
                        const jsonString = item
                            .replace(/'/g, '"')
                            .replace(/(\w+):\s*([^,\s]+)/g, '"$1": "$2"');

                        parsed = JSON.parse(jsonString);
                    } catch (e) {
                        const fixedString = item
                            .replace(/'/g, '"')
                            .replace(/id":\s*([a-f0-9]+)/gi, 'id": "$1"');

                        try {
                            parsed = JSON.parse(fixedString);
                        } catch (finalError) {
                            console.error("解析失败:", item);
                            parsed = {};
                        }
                    }
                    return parsed;
                });
            }

            if (!Array.isArray(data) || data.length === 0) {
                return "";
            }

            const fieldNames = fields || Object.keys(data[0]);
            const escapeField = (value) => {
                if (value === null || value === undefined) return "";
                if (Array.isArray(value)) {
                    return JSON.stringify(value);
                }
                const strValue = String(value);
                if (
                    strValue.includes('"') ||
                    strValue.includes(delimiter) ||
                    strValue.includes("\n")
                ) {
                    return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
            };

            const buildRow = (obj) =>
                fieldNames
                    .map((field) => escapeField(obj[field]))
                    .join(delimiter);

            let csv = includeHeader
                ? fieldNames.map(escapeField).join(delimiter) + "\n"
                : "";

            return csv + data.map(buildRow).join("\n");
        } catch (e) {
            console.log("convertToCSV error: ", e.message);
        }
    }
}

export default APIWrapperFactory;

async function exampleUsage() {
    try {
        // const obj = { route: "hot_topics", params: { page: "2" } };
        // const obj = { route: "notes_comment_by_next_page", params: { noteId: "681b3279000000002100429c" } };
        // userId=66896ebc000000000303084b
        // const obj = {
        //     route: "get_user",
        //     params: { userId: "58e6693382ec392748251566" },
        // };
        // const obj = {
        //     route: "get_note_list",
        //     params: { userId: "5d526ee0000000001200e485" },
        // };
        const noteSet = new Set();

        // while (true) {
        //     const searchResults = await APIWrapperFactory.executeRequest(
        //         obj,
        //         "22244"
        //     );
        //     for (const item of searchResults) {
        //         noteSet.add(item.note_id);
        //     }
        //     console.log(
        //         " yykai searchResults get user res size: ",
        //         noteSet.size
        //     );
        //     if (!searchResults) {
        //         break;
        //     }
        // }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

function getHotDate(): any {
    const format = (d) =>
        `${d.getFullYear()}-${(d.getMonth() + 1 + "").padStart(2, "0")}-${(
            d.getDate() + ""
        ).padStart(2, "0")}`;
    const currentDate = new Date();
    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const datestr = format(threeDaysAgo);
    console.log(datestr);
    return datestr;
}
// exampleUsage();
