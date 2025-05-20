import express from "express";
import axios from "axios";


class Server {
    private app: express.Application;
    private server: any;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private setupRoutes() {
        this.app.get("/health", async (req, res) => {
            // cookies  check.
            const item1_name = "hot_words";
            const item1_value = await this.getHealthResponce(item1_name);

            const item2_name = "topic_rank";
            const item2_value = await this.getHealthResponce(item2_name);

            const item3_name = "note_search";
            const item3_value = await this.getHealthResponce(item3_name);

            const item4_name = "comment_search";
            const item4_value = await this.getHealthResponce(item4_name);

            res.status(200).json({ [item1_name]: item1_value, [item2_name]: item2_value, [item3_name]: item3_value, [item4_name]: item4_value  });
        });

        this.app.post("/echo", (req, res) => {
            const { message } = req.body;
            res.json({ received: message });
        });
    }

    private async getHealthResponce(item_name: string) {
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
    }

    public start(port: number) {
        this.server = this.app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        const gracefulShutdown = () => {
            console.log("Received shutdown signal, closing server...");
            this.server.close(() => {
                console.log("Server closed successfully");
                process.exit(0);
            });

            setTimeout(() => {
                console.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public async stop() {
        if (this.server) {
            this.server.close(() => {
                console.log("Server stopped");
            });
        }
    }
}

const server = new Server();
server.start(3344);
