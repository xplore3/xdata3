import axios from "axios";
import { Router } from "express";

export function createHealthRouter() {
    const router = Router();

    router.get("/health_cookies", async (req, res) => {
        const item1_name = "hot_words";
        const item1_value = await getHealthResponce(item1_name);

        const item2_name = "topic_rank";
        const item2_value = await getHealthResponce(item2_name);

        const item3_name = "note_search";
        const item3_value = await getHealthResponce(item3_name);

        const item4_name = "comment_search";
        const item4_value = await getHealthResponce(item4_name);

        const item5_name = "hot_post";
        const item5_value = await getHealthResponce(item5_name);

        const item6_name = "hot_kols";
        const item6_value = await getHealthResponce(item6_name);

        res.status(200).json({
            [item1_name]: item1_value,
            [item2_name]: item2_value,
            [item3_name]: item3_value,
            [item4_name]: item4_value,
            [item5_name]: item5_value,
            [item6_name]: item6_value,
        });
    });

    async function getHealthResponce(item_name: string) {
        // cookies  check.
        if (item_name === "comment_search") {
            try {
                const response = await axios.get(
                    "http://47.120.60.92:8080/api/comment",
                    {
                        params: {
                            noteId: "68134689000000002002b2be",
                            lastCursor: "",
                        },
                    }
                );
                if (response?.data?.data?.comments?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }
        if (item_name === "note_search") {
            try {
                const response = await axios.get(
                    "http://47.120.60.92:8080/api/search",
                    {
                        params: {
                            keyword: "AI",
                            page: "",
                        },
                    }
                );
                if (response?.data?.data?.items?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }
        if (item_name === "topic_rank") {
            try {
                const response = await axios.post(
                    "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/topicRank",
                    {
                        type: "\u5168\u90E8",
                        dateType: 1,
                        sort: "interactiveCount",
                        rankDate: "2025-05-19",
                        size: 20,
                        start: 1,
                    },
                    {
                        headers: {
                            "n-token": "35c430ef650b459ba2b9c1409148d929",
                            request_id: "05c9a9ad73d64850a087b03bcf4d8b50",
                            Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; token=4C4729530477498BAEEC97859C380B26; acw_tc=0a472f4317477286944042667e007e879955147b13f7ce1efeee0e489c211f; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D; auth_n=37ZQoBZfU8kqgB463MGBXeOTQMzOnuqmpuQNP0iNQ58JDXxtcb44312GIfD0ZsQV",
                        },
                    }
                );
                if (response?.data?.data?.list?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }

        if (item_name === "hot_words") {
            try {
                const response = await axios.post(
                    "https://gw.newrank.cn/api/xhsv2/nr/app/xh/v2/rank/hotWordHotList",
                    {
                        rankType: "day",
                        rankDate: "2025-05-19",
                        size: 20,
                        start: 1,
                        sort: "hot_score",
                    },
                    {
                        headers: {
                            "n-token": "35c430ef650b459ba2b9c1409148d929",
                            request_id: "e35a27c0f028425f9a8b96c6b37bab30",
                            Cookie: "tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; token=4C4729530477498BAEEC97859C380B26; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D; acw_tc=1a0c399717477309968887216e005a44214b0ae8591dccc4e0c0255ba831e2; auth_n=37ZQoBZfU8kqgB463MGBXeOTQMzOnuqmpuQNP0iNQ5+vY+AaKU/ZXPASuRT1eoxl",
                        },
                    }
                );

                if (response?.data?.data?.list?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }

        if (item_name === "hot_post") {
            try {
                const response = await axios.post(
                    "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/surgeNoteNewRank",
                    {
                        noteCategory: "\u7F8E\u5986",
                        riseDate: "2025-05-19 00:00:00+08",
                        dateType: 1,
                        sort: "interactive_count_incr",
                        start: 10,
                        size: 20,
                    },
                    {
                        headers: {
                            "n-token": "35c430ef650b459ba2b9c1409148d929",
                            request_id: "1dc25ca4c4344fddaec88a6a12d56d9c",
                            Cookie: 'tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; token=4C4729530477498BAEEC97859C380B26; acw_tc=1a0c399717477934219213851e008272355d25ad6a55cfe60da29f188732c4; NR_MAIN_SOURCE_RECORD={"locationSearch":"","locationHref":"https://xh.newrank.cn/","referrer":"https://www.google.com/","source":30000,"keyword":"seo","firstReferrer":"","firstLocation":"","sourceHref":"https://xh.newrank.cn/"}; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D; auth_n=37ZQoBZfU8kqgB463MGBXeOTQMzOnuqmpuQNP0iNQ5/FEgkgWIYuUvHhsmWI0cuS',
                        },
                    }
                );
                if (response?.data?.data?.list?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }
        if (item_name === "hot_kols") {
            try {
                const response = await axios.post(
                    "https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/red/user/search",
                    {
                        input: {
                            type: [
                                "name",
                                "desc",
                                "auth",
                                "tag",
                                "location",
                                "rid",
                            ],
                        },
                        sort: "recentNewrankIndex",
                        size: 20,
                        start: 1,
                        cycle: "30d",
                    },
                    {
                        headers: {
                            "n-token": "35c430ef650b459ba2b9c1409148d929",
                            request_id: "c5d71ec44e26460ba66502f575262fb5",
                            Cookie: 'tfstk=gTxnMOGrRe7IM6RY9CSIo3eA28gOAJs5kQERwgCr715_wQpyeuVyEQbRvLlBrCjBXeER9XskUIIoMjnxDp9CAglxMvu71SIVH_WUw6rwQgBoJ0tqMp9CVR90-rBed8j7VkJP4QSN7tX54yrPaAbNHTSzYarU7551UgSP8TPa7t6VU95P4AvN1TSPaQSr9NZPi3-6bfTQWZJWjItGKwf2IVZ8VyWUMs9FOurPt9bhSp5g4u-MrwvbL6ubB_sdOLWHNmZCYaYyvG-E_0S2lCxlui0-divMWEQHSXrl6HLMjMKENr99I_Rl4eM7_ddAtESBe8GwIZvyVN8EskvCjttPu3Vn6_LvBH7MgfEMNaYyvG-E_mjrPPzVSxr5QYKaPz_FCOfAijAkA_Y1lLkiIrgC8O6KMADgPW7FCOXiIA44VwW1L8C..; token=4C4729530477498BAEEC97859C380B26; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_my2b9az6y%22%2C%22first_id%22%3A%2219641461076860-0e9b6d1278a91f-26011c51-2073600-19641461077b29%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2NDE0NjEwNzY4NjAtMGU5YjZkMTI3OGE5MWYtMjYwMTFjNTEtMjA3MzYwMC0xOTY0MTQ2MTA3N2IyOSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yX215MmI5YXo2eSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_my2b9az6y%22%7D%7D; NR_MAIN_SOURCE_RECORD={"locationSearch":"","locationHref":"https://newrank.cn/ranktopic/xiaohongshu","referrer":"https://chatgpt.com/","source":30000,"keyword":"seo","firstReferrer":"","firstLocation":"","sourceHref":"https://newrank.cn/ranktopic/xiaohongshu"}; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; Hm_lpvt_a19fd7224d30e3c8a6558dcb38c4beed=1747811125; HMACCOUNT=BB799F0B1F6344B7; acw_tc=1a0c399b17478131578365081e0069831782947e70300f620bada0f5f244b9; auth_n=37ZQoBZfU8kqgB463MGBXRWdUP8KVjgKDWQqgXbzfX0S1BUF0ISWkNNWr3e903XB',
                        },
                    }
                );
                if (response?.data?.data?.list?.length > 0) {
                    return "success";
                }
            } catch (error) {
                console.error("Error during search:", error);
            }
            return "error";
        }
    }

    return router;
}
