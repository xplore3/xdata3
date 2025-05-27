import { DirectClient } from "./index";
import express from "express";
import axios from 'axios';

import crypto from "wechat-crypto";
import xml2js from "xml2js";
import { decrypt, encrypt, getJsApiSignature, getSignature } from "@wecom/crypto";
import {
    ModelClass,
    generateText,
    type IAgentRuntime,
} from "@data3os/agentcontext";
import {
    handleProtocols,
} from "data3-protocols";
import cron from "node-cron";
import { PromptTemplates } from "./promts";


export class WechatHandler {
    constructor(private client: DirectClient) {}

    cachedToken: string = null;
    tokenExpire = 0;
    cursor: string = null;
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

    async getAccessToken() {
        const now = Date.now();
        if (this.cachedToken && this.tokenExpire > now) {
            return this.cachedToken;
        }

        const res = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/gettoken', {
          params: {
            corpid: process.env.WECHAT_CORP_ID,
            corpsecret: process.env.WECHAT_CORP_SECRET
          }
        })

        if (res.data.errcode !== 0) {
          throw new Error(`Token get failed: ${res.data.errmsg}`);
        }

        this.cachedToken = res.data.access_token;
        this.tokenExpire = now + res.data.expires_in * 1000 - 60 * 1000;
        return this.cachedToken;
    }

    async sendMessage(external_userid: string, kfid: string, content: string) {
        try {
            console.log("sendMessage " + content);
            const token = await this.getAccessToken();
            const msg = {
                touser: external_userid,
                open_kfid: kfid,
                //sender: process.env.WECHAT_MY_WECOM_ID, // Wecom ID
                text: {
                  content
                },
                msgtype: 'text'
            };
            /*const payload = {
                touser: toUser, // multi-user: 'zhangsan|lisi'
                msgtype: "text",
                agentid: process.env.WECHAT_WECOM_AGENT_ID,
                text: { content },
                safe: 0
            };*/
            const resp = await axios.post(`https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=${token}`, msg);
            console.log("sendMessage " + resp.data.errmsg);
            if (resp.data.errcode !== 0) {
                throw new Error(`sendMessage failed: ${resp.data.errmsg}`);
            }
            return resp.data;
        }
        catch (err) {
            console.log(err);
        }
    }

    async syncMessage(msg_token: string, kfid: string) {
        try {
            console.log("syncMessage " + msg_token);
            const token = await this.getAccessToken();
            const msg = {
                cursor: this.cursor,
                token: msg_token,
                limit: 100,
                voice_format: 0,
                open_kfid: kfid
            };
            const resp = await axios.post(`https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=${token}`, msg);
            //console.log(resp);
            console.log("syncMessage " + resp.data.errmsg);
            if (resp.data.errcode !== 0) {
                throw new Error(`syncMessage failed: ${resp.data.errmsg}`);
            }
            if (resp.data.next_cursor) {
                this.cursor = resp.data.next_cursor
            }
            return resp.data;
        }
        catch (err) {
            console.log(err);
        }
    }

    async handleWechatInputMessage(req: express.Request, res: express.Response) {
        console.log("handleWechatInputMessage");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                const { msg_signature, timestamp, nonce, echostr } = req.query;
                if (echostr) {
                    const { random, message } = decrypt(process.env.WECHAT_ENCODING_AESKEY,
                        echostr);
                    console.log(message);
                    res.send(message);
                    return;
                }
                //const cryptor = new crypto(process.env.WECHAT_TOKEN,
                //    process.env.WECHAT_ENCODING_AESKEY,
                //    process.env.WECHAT_CORP_ID);
                console.log(req.body);
                const xmlData = req.body
                const parsedXml = await xml2js.parseStringPromise(xmlData, { explicitArray: false })
                const encryptMsg = parsedXml.xml.Encrypt
                const decrypted = decrypt(process.env.WECHAT_ENCODING_AESKEY, encryptMsg)
                const decryptedXml = await xml2js.parseStringPromise(decrypted.message, { explicitArray: false })
                //const msg = decryptedXml.xml
                console.log(decryptedXml.xml);
                const msg = await this.syncMessage(decryptedXml.xml.Token, decryptedXml.xml.OpenKfId);
                console.log(msg);
                if (msg.errcode == 0 && msg.msg_list && msg.msg_list.length > 0) {
                    const index = msg.msg_list.length - 1;
                    const firstMsg = msg.msg_list[index];
                    if (firstMsg.msgtype == 'text') {
                        console.log(firstMsg.text.content);
                        const firstText = firstMsg.text.content;
                        const userId = firstMsg.external_userid;

                        // Check If Menu
                        if (await this.checkCommandMenu(firstText, userId, decryptedXml.xml.OpenKfId)) {
                            res.send('success');
                            return;
                        }

                        // checkResp
                        let checkCount = 0;
                        const job = cron.schedule("*/2 * * * *", async () => {
                            console.log(`Wechat check at ${new Date().toISOString()}`);
                            if (checkCount++ > 2) {
                                return;
                            }
                            await this.checkTaskStatus(runtime, userId, decryptedXml.xml.OpenKfId);
                        });

                        try {
                            let immResp = "...";
                            if (firstText.length < 20) {
                                immResp = await this.generateQuickResponse(runtime, firstText);
                            }
                            else {
                                const lang = this.detectLanguage(firstText);
                                immResp = this.getFirstResponse(lang);
                            }
                            await this.sendMessage(userId,
                                decryptedXml.xml.OpenKfId, immResp);
                            const questionAfter = await this.generateResponseByData3(
                                runtime, userId, firstText);
                            await this.sendMessage(userId,
                                decryptedXml.xml.OpenKfId, questionAfter);
                        }
                        catch (err) {
                            console.log(err);
                        }
                        job.stop();
                    }
                }

                // Emit message to custom handler
                //if (msg.MsgType == 'text') {
                    //await handleProtocols(runtime, msg.Content).then(async (resStr) => {
                    //    console.log(resStr);
                    //    await this.sendMessage(msg.FromUserName, resStr);
                    //});
                    //await this.sendMessage(msg.FromUserName, msg.content);
                //}

                res.send('success')
            } catch (err) {
                console.error('[WecomListener] Error handling callback:', err)
                res.send('fail')
            }
        }
    }

    async checkCommandMenu(cmd: string, userId: string, openKfId: string) {
        try {
            if (cmd === '模板' || cmd === '获取模板' || cmd === '所有模板') {
                const prompts = await PromptTemplates.getPromptTemplates();
                const output: string = `${prompts.map((line, i) => `${i + 1}. ${line}`).join('\n\n')}`;
                await this.sendMessage(userId, openKfId, output);
                return true;
            }
        }
        catch (err) {
            console.log(err);
        }
        return false;
    }

    async checkTaskStatus(runtime: IAgentRuntime, userId: string, openKfId: string) {
        try {
            /*const config = {
                url: 'http://localhost:3333/91edd400-9c4a-0eb5-80ce-9d32973f2c49/task_status?taskId=' + taskId,
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const response = await axios(config);
            console.log(response.data);
            if (response.status != 200) {
                return "Error in response " + response.statusText;
            }
            return response.data.task_status;*/
            if (userId && openKfId) {
                const taskId = await this.getCachedData<string>(runtime, userId);
                if (taskId) {
                    let status = await runtime.cacheManager.get(taskId + "_memory_by_step");
                    console.log(taskId + ", " + status);
                    try {
                        const match = status.match(/current_step:\s*(\d+)/);
                        const step = match ? parseInt(match[1], 10) : null;
                        status = `Step ${step} ...`;
                    } catch (error) {}
                    await this.sendMessage(userId, openKfId, status);
                }
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    async generateResponseByData3(runtime: IAgentRuntime, userId: string, input: string) {
        try {
            /*await handleProtocols(runtime, firstMsg.text.content).then(async (resStr) => {
                console.log(resStr);
                await this.sendMessage(firstMsg.external_userid,
                decryptedXml.xml.OpenKfId, resStr);
            });*/
            // const tempUrl = "http://localhost:3333/91edd400-9c4a-0eb5-80ce-9d32973f2c49/message";
            // const resp = await fetch(tempUrl,
            //     {
            //         method: 'POST',
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //         body:JSON.stringify({
            //             text: input
            //         }),
            //     });
            // console.log(resp);
            // if (resp.ok) {
            //     return resp.json();
            // }

            const taskId = await this.getCachedData<string>(runtime, userId);
            const config = {
                url: 'http://localhost:3333/91edd400-9c4a-0eb5-80ce-9d32973f2c49/message',
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    taskId,
                    text: input
                }
            };

            const response = await axios(config);
            console.log(response.data);
            if (response.status != 200) {
                return "Error in response " + response.statusText;
            }
            try {
                const json = JSON.parse(response.data?.text);
                if (json) {
                    await this.setCachedData(runtime, userId, json.taskId);
                    if (json.need_more) {
                        let text = `${json.question_description}\n\n${json.available_options.join('\n')}`;
                        return text;
                    }
                    else {
                        return json.question_description;
                    }
                }
            } catch (err) {
                console.log(err);
            }
            return response.data?.text;
        }
        catch (err) {
            console.log(err);
        }
        try {
            return await generateText({
                runtime,
                context: input,
                modelClass: ModelClass.SMALL,
            });
        }
        catch (err) {
            console.log(err);
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
        return;
    }

    private detectLanguage(text: string):
        'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'ru' | 'ar' | 'emoji' | 'other' {

        const regexMap = {
            zh: /[\u4e00-\u9fa5]/,
            //en: /^[a-zA-Z\s]+$/,
            ja: /[\u3040-\u30ff\u31f0-\u31ff\uFF66-\uFF9F]/,
            ko: /[\uac00-\ud7af\u1100-\u11ff]/,
            fr: /[àâçéèêëîïôûùüÿœæÀÂÇÉÈÊËÎÏÔÛÙÜŸŒÆ]/,
            es: /[áéíñóúüÁÉÍÑÓÚÜ¡¿]/,
            ru: /[\u0400-\u04FF]/,
            ar: /[\u0600-\u06FF]/,
            emoji: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u // 常见 emoji 范围
        };
        const counts: Record<string, number> = {};
        for (const [lang, regex] of Object.entries(regexMap)) {
            const matches = text.match(new RegExp(regex, regex.flags + 'g'));
            counts[lang] = matches ? matches.length : 0;
        }

        const detected = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        if (detected.length === 1) {
            return detected[0][0] as any;
        }

        if (/^[a-zA-Z\s.,!?'"()\-]+$/.test(text)) {
            return 'en';
        }
        return 'other';
    }

    private getFirstResponse(language: string) {
        const responseMap: Record<string, string> = {
            zh: "收到，请稍等……",
            en: "Ok, please wait a moment...",
            ja: "承知しました。少々お待ちください……",
            ko: "확인했습니다. 잠시만 기다려주세요……",
            fr: "Reçu, veuillez patienter un instant…",
            es: "Recibido, por favor espere un momento…",
            ru: "Получено, пожалуйста, подождите немного…",
            ar: "تم الاستلام، يرجى الانتظار قليلاً...",
            emoji: "✅⌛🙂",
            other: "Ok, please wait a few mins...",
        };

        let resp = responseMap[language] as string || "......" ;
        const now = Date.now();
        if (now % 3 == 1) {
            return resp + "\n\n回复‘模板’获取常用提示词模板";
        }
        else  {
            return resp;
        }
    }

    private async generateQuickResponse(runtime: IAgentRuntime, text: string) {
        try {
            const prompt = `根据用户的输入内容：【${text}】，快速给出一个同种语言的简短回复，只给出结果就可以`;
            let resp = await generateText({
                runtime,
                context: prompt,
                modelClass: ModelClass.SMALL,
            });

            const now = Date.now();
            if (now % 3 == 1) {
                return resp + "\n\n回复‘模板’获取常用提示词模板";
            }
            else {
                return resp;
            }
        } catch (err) {
            console.log(err);
        }
    }
}
