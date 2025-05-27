import { DirectClient } from "./index";
import {
    type IAgentRuntime,
} from "@data3os/agentcontext";
import express from "express";

export class PromptTemplates {
    constructor(private client: DirectClient) {}

    userId: string = null;

    private async readFromCache<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const cached = await runtime.cacheManager.get<T>(key);
        return cached;
    }

    private async writeToCache<T>(runtime: IAgentRuntime, key: string, data: T): Promise<void> {
        try {
            await runtime.cacheManager.set(key,
                data,
                {
                    expires: Date.now() + 60 * 60 * 1000, // a hour
                }
            );
        }
        catch (err) {
            console.log(`writeToCache key ${key}`);
            console.error(err);
        }
    }

    private async getCachedData<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const fileCachedData = await this.readFromCache<T>(runtime, key);
        if (fileCachedData) {
            return fileCachedData;
        }

        return null;
    }

    private async setCachedData<T>(runtime: IAgentRuntime, cacheKey: string, data: T): Promise<void> {
        await this.writeToCache(runtime, cacheKey, data);
    }

    async handlePromptTemplates(req: express.Request, res: express.Response) {
        console.log("handlePromptTemplates");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                const prompts = await PromptTemplates.getPromptTemplates();
                const output: string = `[\n${prompts.join('\n')}\n]`;
                res.send(output);
            } catch (err) {
                console.error('[WecomListener] Error handling callback:', err)
                res.send('fail')
            }
        }
    }

    private getAgentId(req: express.Request, res: express.Response) {
        const agentId = req.params.agentId;
        if (agentId) {
            let runtime = this.client.agents.get(agentId);
            try {
                if (!runtime) {
                    runtime = Array.from(this.client.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }
            }
            catch (err) {
                console.log(err);
            }
            //console.log(runtime)
            if (runtime) {
                return runtime;
            }
            res.status(404).json({ error: "Agent not found" });
            return;
        }
        res.status(400).json({ error: "Missing agent id" });
    }

    static async getPromptTemplates() {
        const prompts = [
            '最近小红书/抖音的热词、热话题有哪些？爆文都用什么结构？标题是怎么写的？',
            '和我卖同款的其他商家内容发得怎么样？他们怎么布局评论？评论有挂商链吗？',
            '能帮我对比一下这周5篇视频的互动率吗？哪类内容最受欢迎？哪条笔记有人看完就点商品了',
            '买家都在评论区问什么？用户更关心“价格”还是“使用体验”？',
            '这个KOL互动率正常吗？粉丝是活的吗？ 有没有带过类似品类的产品？'
        ];
        return prompts;
    }
}
