// routine.ts
import express from "express";
import { DirectClient } from "./index";
import {
    type IAgentRuntime,
} from "@data3os/agentcontext";
import {
    IntentionHandler,
    TaskHelper,
    RountineHandler,
} from "data3-protocols";

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
                //await RountineHandler.handleRoutine(runtime, message);
                const output: string = '\n\n';
                res.send(output);
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
