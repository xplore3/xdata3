import { DirectClient } from "./index";
import express from "express";
import axios from 'axios';

import crypto from "wechat-crypto";
import xml2js from "xml2js";
import { decrypt, encrypt, getJsApiSignature, getSignature } from "@wecom/crypto";

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

    async sendMessage(external_userid: string, content: string) {
        try {
            console.log("sendMessage " + content);
            const token = await this.getAccessToken();
            const msg = {
                chat_type: 'single',
                external_userid: [external_userid],
                sender: process.env.WECHAT_MY_WECOM_ID, // Wecom ID
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
            console.log(resp);
            return resp.data;
        }
        catch (err) {
            console.log(err);
        }
    }

    async syncMessage(msg_token: string) {
        try {
            console.log("syncMessage " + msg_token);
            const token = await this.getAccessToken();
            const msg = {
                cursor: this.cursor,
                token: msg_token,
                limit: 1,
                voice_format: 0
            };
            const resp = await axios.post(`https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=${token}`, msg);
            console.log(resp);
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
        //const runtime = this.getAgentId(req, res);
        //if (runtime) {
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
                const msg = await this.syncMessage(decryptedXml.xml.Token);
                console.log(msg);
                if (msg.msg_list) {
                    const firstMsg = msg.msg_list[0];
                    if (firstMsg.msgtype == 'text') {
                        await this.sendMessage(firstMsg.external_userid, firstMsg.text.content);
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
        //}
    }

    private getAgentId(req: express.Request, res: express.Response) {
        const agentId = req.params.agentId;
        if (agentId) {
            const runtime = this.client.agents.get(agentId);
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
