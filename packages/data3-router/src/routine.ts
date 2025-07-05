// routine.ts
import express from "express";
import { DirectClient } from "./index";
import {
    Memory,
    stringToUuid,
    getEmbeddingZeroVector,
    type Content,
    type IAgentRuntime,
} from "@data3os/agentcontext";
import {
    IntentionHandler,
    TaskHelper,
    RountineHandler,
    UserKnowledge,
} from "data3-protocols";

const ROUNTINE_OPTION_POSITIONING_ANALYSIS = 'positioning_analysis';
const ROUNTINE_OPTION_TODAY_POST = 'today_posts';
const ROUNTINE_OPTION_HOT_POST = 'hot_posts';
const ROUNTINE_OPTION_SEARCH_KOC = 'search_koc';
const ROUNTINE_OPTION_TREND_PRIDICTION = 'trend_prediction';

export class RoutineController {
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

    async handleRoutine(req: express.Request, res: express.Response) {
        console.log("handleRoutine");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                const option = req.body.option;
                if (!option) {
                    res.status(400).json({ error: "Missing option parameter" });
                    return;
                }
                if (typeof option !== 'string') {
                    res.status(400).json({ error: "Option parameter must be a string" });
                    return;
                }
                const agentId = req.params.agentId;
                const username = req.body.userId ?? "user";
                const userId = stringToUuid(username);
                const roomId = stringToUuid("default-data-room-" + username);
                const originText = req.body.text;
                const messageId = stringToUuid(userId + Date.now().toString());

                const content: Content = {
                    text: originText,
                    intention: {
                        taskId: await TaskHelper.generateTaskId(),
                    },
                    // attachments,
                    attachments: [],
                    source: "direct",
                    inReplyTo: undefined,
                };

                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const memory: Memory = {
                    id: messageId,
                    ...userMessage,
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(memory);

                let state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                let responseStr = null;
                const taskId = content.intention?.taskId || "";
                if (option === ROUNTINE_OPTION_POSITIONING_ANALYSIS) {
                    responseStr = await UserKnowledge.getUserRoutineCache(runtime, ROUNTINE_OPTION_POSITIONING_ANALYSIS + userId);
                    if (!responseStr) {
                        responseStr = await RountineHandler.handlePositioningAnalysis(runtime, memory);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_POSITIONING_ANALYSIS + userId, responseStr);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, responseStr, true);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_POSITIONING_ANALYSIS + userId, '');
                        setTimeout(async () => {
                            try {
                                memory.content.intention.taskId = TaskHelper.generateTaskId();
                                responseStr = await RountineHandler.handlePositioningAnalysis(runtime, memory);
                                await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_POSITIONING_ANALYSIS + userId, responseStr);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else if (option === ROUNTINE_OPTION_TODAY_POST) {
                    responseStr = await UserKnowledge.getUserRoutineCache(runtime, ROUNTINE_OPTION_TODAY_POST + userId);
                    if (!responseStr) {
                        responseStr = await RountineHandler.handleTodayPosts(runtime, memory);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TODAY_POST + userId, responseStr);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, responseStr, true);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TODAY_POST + userId, '');
                        setTimeout(async () => {
                            try {
                                memory.content.intention.taskId = TaskHelper.generateTaskId();
                                responseStr = await RountineHandler.handleTodayPosts(runtime, memory);
                                await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TODAY_POST + userId, responseStr);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else if (option === ROUNTINE_OPTION_HOT_POST) {
                    responseStr = await UserKnowledge.getUserRoutineCache(runtime, ROUNTINE_OPTION_HOT_POST + userId);
                    if (!responseStr) {
                        responseStr = await RountineHandler.handleHotPosts(runtime, memory);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_HOT_POST + userId, responseStr);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, responseStr, true);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_HOT_POST + userId, '');
                        setTimeout(async () => {
                            try {
                                memory.content.intention.taskId = TaskHelper.generateTaskId();
                                responseStr = await RountineHandler.handleHotPosts(runtime, memory);
                                await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_HOT_POST + userId, responseStr);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else if (option === ROUNTINE_OPTION_SEARCH_KOC) {
                    responseStr = await UserKnowledge.getUserRoutineCache(runtime, ROUNTINE_OPTION_SEARCH_KOC + userId);
                    if (!responseStr) {
                        responseStr = await RountineHandler.handleSearchKoc(runtime, memory);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_SEARCH_KOC + userId, responseStr);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, responseStr, true);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_SEARCH_KOC + userId, '');
                        setTimeout(async () => {
                            try {
                                memory.content.intention.taskId = TaskHelper.generateTaskId();
                                responseStr = await RountineHandler.handleSearchKoc(runtime, memory);
                                await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_SEARCH_KOC + userId, responseStr);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else if (option === ROUNTINE_OPTION_TREND_PRIDICTION) {
                    responseStr = await UserKnowledge.getUserRoutineCache(runtime, ROUNTINE_OPTION_TREND_PRIDICTION + userId);
                    if (!responseStr) {
                        responseStr = await RountineHandler.handleTrendPrediction(runtime, memory);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TREND_PRIDICTION + userId, responseStr);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, responseStr, true);
                        await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TREND_PRIDICTION + userId, '');
                        setTimeout(async () => {
                            try {
                                memory.content.intention.taskId = TaskHelper.generateTaskId();
                                responseStr = await RountineHandler.handleTrendPrediction(runtime, memory);
                                await UserKnowledge.setUserRoutineCache(runtime, ROUNTINE_OPTION_TREND_PRIDICTION + userId, responseStr);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else {
                    res.status(400).json({ error: "Invalid option parameter" });
                    return;
                }

                const parsedContent: Content = {
                    text: responseStr,
                    // attachments,
                    attachments: [],
                    source: "direct",
                    inReplyTo: messageId,
                };

                if (!parsedContent) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                // save response to memory
                const responseMessage: Memory = {
                    id: messageId,
                    ...userMessage,
                    userId: userId,
                    content: parsedContent,
                    embedding: getEmbeddingZeroVector(),
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(responseMessage);

                state = await runtime.updateRecentMessageState(state);
                res.json({
                    user: "Data3",
                    text: responseStr,
                    action: "NONE",
                });
                //res.send(responseStr);
            } catch (err) {
                console.error('[RoutineController] Error handling routine:', err)
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

}
