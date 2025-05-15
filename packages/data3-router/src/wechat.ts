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


export class WechatHandler {
    constructor(private client: DirectClient) {}

    cachedToken: string = null;
    tokenExpire = 0;
    cursor: string = null;

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
            console.log("sendMessage" + resp.data.errmsg);
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
            console.log("syncMessage" + resp.data.errmsg);
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
        const userId = req.query.userId
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
                        try {
                            const questionAfter = await this.generateResponseByData3(
                                runtime, firstMsg.text.content);
                            await this.sendMessage(firstMsg.external_userid,
                                decryptedXml.xml.OpenKfId, questionAfter);
                        }
                        catch (err) {
                            console.log(err);
                        }
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

    async generateResponseByData3(runtime: IAgentRuntime, input: string) {
        try {
            /*await handleProtocols(runtime, firstMsg.text.content).then(async (resStr) => {
                console.log(resStr);
                await this.sendMessage(firstMsg.external_userid,
                decryptedXml.xml.OpenKfId, resStr);
            });*/
            const tempUrl = "http://localhost:3333/91edd400-9c4a-0eb5-80ce-9d32973f2c49/message";
            const resp = await fetch(tempUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body:JSON.stringify({
                        text: input
                    }),
                });
            console.log(resp);
            if (resp.ok) {
                return resp.json();
            }
        }
        catch (err) {
            console.log(err);
        }
        try {
            return await generateText({
                runtime,
                context: input,
                modelClass: ModelClass.MEDIUM,
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
}
