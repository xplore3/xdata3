import {
    composeContext,
    data3Logger,
    generateCaption,
    generateImage,
    generateMessageResponse,
    generateObject,
    getEmbeddingZeroVector,
    messageCompletionFooter,
    ModelClass,
    settings,
    stringToUuid,
    type AgentRuntime,
    type Client,
    type Content,
    type IAgentRuntime,
    type Media,
    type Memory,
    type Plugin,
    type UUID,
    generateText,
    parseJSONObjectFromText,
} from "@data3os/agentcontext";

import { mdToPdf } from "md-to-pdf";

import {
    IntentionHandler,
    TaskHelper,
    UserKnowledge,
    getProtocolArray,
    updateProtocolArray,
    handleProtocolsForPrompt,
    handleProtocolsProcessing,
    handleProtocolsOutput,
    handleProtocolsForQuickResponce,
} from "data3-protocols";

import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import express, { type Request as ExpressRequest } from "express";
import * as fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import * as path from "path";
import { z } from "zod";
import { createApiRouter } from "./api.ts";
import { createVerifiableLogApiRouter } from "./verifiable-log-api.ts";
import { WechatHandler } from "./wechat.ts";
import { PromptController } from "./promts.ts";
import { fileURLToPath } from "url";
import { exceptionHandler, parseToken } from "./auth.ts";
import { RoutineController } from "./routine.ts";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});
interface TaskQuestionObj {
    questionText: string;
    promptModifyNum: number;
    taskId: string;
    prevQuestionText: string;
}
// some people have more memory than disk.io
const upload = multer({ storage /*: multer.memoryStorage() */ });

export const messageHandlerTemplate =
    // {{goals}}
    // "# Action Examples" is already included
    `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;

export const hyperfiHandlerTemplate = `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "lookAt": "{{nearby}}" or null, "emote": "{{emotes}}" or null, "say": "string" or null, "actions": (array of strings) or null }
\`\`\`
`;

export const dataHandlerTemplate = `
##
Some additional information about the task:
#####################################
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

{{recentMessages}}
#####################################
`;
// Note(Important) : The message list is too long and may be trimmed sometimes.
// So put the messages({{recentMessages}}) at the end, trim some old ones and keep the new ones.
// Prioritize removing messages over other fields.


function stringToHash4(str) {
    let hash = 0;
    for (let char of str) {
        const code = char.codePointAt(0);
        hash = (hash * 31 + code) % 10000;
    }
    return hash.toString().padStart(4, "0");
}
export class DirectClient {
    public app: express.Application;
    public agents: Map<string, IAgentRuntime>; // container management
    private server: any; // Store server instance
    public startAgent: Function; // Store startAgent functor
    public loadCharacterTryPath: Function; // Store loadCharacterTryPath functor
    public jsonToCharacter: Function; // Store jsonToCharacter functor
    public concurrentNum: number;
    private onlineUsers = new Map();

    constructor() {
        data3Logger.log("DirectClient constructor");
        this.concurrentNum = 0;
        this.app = express();
        this.app.use(exceptionHandler);
        const ONLINE_THRESHOLD = 24 * 60 * 60 * 1000;
        this.app.use((req, res, next) => {
            // const userIP = req.ip;
            const userIP = req.headers["x-real-ip"];
            if (userIP) {
                const now = Date.now();
                for (const [uIP, lastActiveTime] of this.onlineUsers) {
                    if (now - lastActiveTime > ONLINE_THRESHOLD) {
                        this.onlineUsers.delete(uIP);
                    }
                }
                this.onlineUsers.set(userIP, now);
                console.log(
                    `APM time ${new Date(now).toLocaleString()}, current online users: ${this.onlineUsers.size} user ip ${userIP}`
                );
            }
            next();
        });
        this.app.use((req, res, next) => {
            const start = Date.now();
            // TODO: verify token for security
            // if (!this.validateToken(req)) {
            //     res.status(401).json({
            //         code: 401,
            //         message: "Token is invalid or expired",
            //     });
            //     return;
            // }
            res.on("finish", () => {
                const duration = Date.now() - start;
                if (duration > 1000) {
                    // this is not a error, but a highly warning
                    console.error(
                        `APM Method: ${req.method}, API: ${req.url} - time: ${duration} ms`
                    );
                } else {
                    console.log(
                        `APM Method: ${req.method}, API: ${req.url} - time: ${duration} ms`
                    );
                }
            });
            next();
        });

        this.app.use(cors());
        this.app.use((req, res, next) => {
            // const userIP = req.ip;
            const userIP = req.headers["x-real-ip"];
            if (userIP) {
                const now = Date.now();
                console.log(
                    `APM time ${new Date(now).toLocaleString()}, ip ${userIP}`
                );
                console.log(req.originalUrl);
            }
            next();
        });
        this.agents = new Map();

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.text({ type: "text/xml" }));

        // Serve both uploads and generated images
        this.app.use(
            "/media/uploads",
            express.static(path.join(process.cwd(), "/data/uploads"))
        );
        const aifilepath = path.join(process.cwd(), "/files");
        this.app.use((req, res, next) => {
            console.log("req.path:  " + req.path);
            if(req.path.indexOf("/media/files") === -1) {
                next();
                return;
            }
            const fullPath = req.path;
            const basePath = "/media/files";
            const newPath = path.relative(basePath, fullPath);
            const filePath = path.join(process.cwd(), "files", newPath);
            console.log("fix path:  " + filePath);
            if(fs.existsSync(filePath) === false) {
                res.status(404).send("File not found");
                return;
            }

            fs.stat(filePath, (err, stats) => {
                if (err) return next(err);
                const now = Date.now();
                const fileAge = now - stats.mtimeMs;
                if (fileAge > 3 * 24 * 3600000) {
                    res.status(403).send("文件已过期");
                } else {
                    next();
                }
            });
        });
        this.app.use(
            "/media/files",
            express.static(aifilepath)
        );
        this.app.use(
            "/media/generated",
            express.static(path.join(process.cwd(), "/generatedImages"))
        );

        const apiRouter = createApiRouter(this.agents, this);
        this.app.use(apiRouter);

        const apiLogRouter = createVerifiableLogApiRouter(this.agents);
        this.app.use(apiLogRouter);

        // Define an interface that extends the Express Request interface
        interface CustomRequest extends ExpressRequest {
            file?: Express.Multer.File;
        }

        // Update the route handler to use CustomRequest instead of express.Request
        this.app.post(
            "/:agentId/whisper",
            upload.single("file"),
            async (req: CustomRequest, res: express.Response) => {
                const audioFile = req.file; // Access the uploaded file using req.file
                const agentId = req.params.agentId;

                if (!audioFile) {
                    res.status(400).send("No audio file provided");
                    return;
                }

                let runtime = this.agents.get(agentId);
                const apiKey = runtime.getSetting("OPENAI_API_KEY");

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                const openai = new OpenAI({
                    apiKey,
                });

                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(audioFile.path),
                    model: "whisper-1",
                });

                res.json(transcription);
            }
        );

        this.app.post(
            "/:agentId/data_process",
            upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const maxNum = 10;
                if (this.concurrentNum >= maxNum) {
                    res.json({
                        user: "agent",
                        text: "系统正在处理，有些繁忙，请稍后再试~~",
                        taskId: "",
                        action: "NONE",
                    });
                    return;
                }
                const agentId = req.params.agentId;
                const username = req.body.userId ?? "user";
                const userId = UserKnowledge.getUserIdFromRequest(req.body?.userId);;
                const roomId = stringToUuid("default-data-room-" + username);
                const fromOptions = req.body.fromOptions;
                const taskWaitMode = req.body.taskWaitMode;

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }
                this.concurrentNum++;

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const originQuestingText = req.body.text;
                let taskId = req.body.taskId;
                const origin_input = await TaskHelper.getTaskOriginInput(runtime, taskId);
                const messageId = stringToUuid(userId + Date.now().toString());
                console.log(`DataProcess ${taskId}, Option: ${fromOptions}, ${originQuestingText}, ${origin_input}`);

                const content: Content = {
                    text: originQuestingText,
                    intention: {
                        taskId
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

                let newTask = false;
                if (taskId && !fromOptions) {
                    newTask = !(await TaskHelper.checkNewTask(runtime, memory, taskId));
                }
                else if (!taskId) {
                    newTask = true;
                }
                let responseStr = null;
                if (newTask) {
                    taskId = await TaskHelper.generateTaskId();
                    memory.content.intention.taskId = taskId;
                    if (!taskWaitMode) {
                        const quickJson = await TaskHelper.quickResponse(runtime, memory);
                        if (quickJson && quickJson.quick) {
                            responseStr = quickJson.response;
                            await TaskHelper.setTaskStatus(runtime, taskId, '', true);
                        }
                        else {
                            await TaskHelper.setTaskStatus(runtime, taskId, quickJson.response, false);
                            setTimeout(async () => {
                                try {
                                    await IntentionHandler.handleDataCollectAPI(runtime, memory);
                                } catch (err) {
                                    console.error('Background error ', err);
                                }
                            }, 10);
                            //responseStr = `收到啦，任务${taskId}已开始执行，请耐心等待`;
                            responseStr = quickJson.response + `\r\n\r\n任务【${taskId}】已开始执行，预计需要几分钟，请耐心等待`;
                        }
                    }
                    else {
                        await TaskHelper.setWechatTaskId(runtime, userId, taskId);
                        responseStr = await IntentionHandler.handleDataCollectAPI(runtime, memory);
                    }
                }
                else {
                    await TaskHelper.setTaskOriginInput(runtime, taskId, originQuestingText);
                    if (!taskWaitMode) {
                        /*const quickJson = await TaskHelper.quickResponse(runtime, memory);
                        if (quickJson && quickJson.quick) {
                            responseStr = quickJson.response;
                            await TaskHelper.setTaskStatus(runtime, taskId, '', true);
                        }
                        else */{
                            setTimeout(async () => {
                                try {
                                    await IntentionHandler.handleDataProcess(runtime, memory, origin_input);
                                } catch (err) {
                                    console.error('Background error ', err);
                                }
                            }, 10);
                            //responseStr = `收到啦，任务${taskId}已开始执行，请耐心等待`;
                            responseStr = `任务【${taskId}】已开始执行，预计需要几分钟，请耐心等待`;
                            await TaskHelper.setTaskStatus(runtime, taskId, responseStr, false);
                        }
                    }
                    else {
                        responseStr = await IntentionHandler.handleDataProcess(runtime, memory, origin_input);
                    }
                }
                this.concurrentNum--;

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
                    taskId,
                    action: "NONE",
                });
            }
        );

        this.app.post(
            "/:agentId/message",
            upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const maxNum = 10;
                if (this.concurrentNum >= maxNum) {
                    res.json({
                        user: "agent",
                        text: "系统正在处理，有些繁忙，请稍后再试~~",
                        taskId: "",
                        action: "NONE",
                    });
                    return;
                }
                const agentId = req.params.agentId;
                const username = req.body.userId ?? "user";
                const taskWaitMode = req.body.taskWaitMode;
                // const roomId = stringToUuid(
                //    req.body.roomId ?? "default-room-" + agentId
                // );
                const userId = UserKnowledge.getUserIdFromRequest(username);
                const roomId = stringToUuid("default-data-room-" + username);

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }
                this.concurrentNum++;

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const originQuestingText = req.body.text;
                let taskId = req.body.taskId;
                // TODO 1: Assign task ID based on load balancing.
                // TODO 2: Verify the task ID.
                /*function generateTaskId() {
                    const timestamp = Date.now().toString(36);
                    const seq = Math.floor(Math.random() * 1000)
                        .toString(36)
                        .padStart(4, "0");
                    return `TASK-${timestamp}-${seq}`;
                }*/
                let withPreContext = false;

                if (!taskId) {
                    taskId = TaskHelper.generateTaskId();
                    await TaskHelper.setTaskOriginInput(runtime, taskId, originQuestingText);
                } else {
                    withPreContext = true;
                }
                const messageId = stringToUuid(userId + Date.now().toString());

                // const attachments: Media[] = [];
                // if ((req as any).file) {
                //     const filePath = path.join(
                //         process.cwd(),
                //         "data",
                //         "uploads",
                //         (req as any).file.filename
                //     );
                //     attachments.push({
                //         id: Date.now().toString(),
                //         url: filePath,
                //         title: (req as any).file.originalname,
                //         source: "direct",
                //         description: `Uploaded file: ${
                //             (req as any).file.originalname
                //         }`,
                //         text: "",
                //         contentType: (req as any).file.mimetype,
                //     });
                // }

                const content: Content = {
                    text: originQuestingText,
                    intention: {
                        taskId
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

                //await runtime.messageManager.addEmbeddingToMemory(memory);
                await runtime.messageManager.createMemory(memory);
                // console.log("userMessage :", userMessage , username);

                let state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                // const context = composeContext({
                //     state,
                //     template: messageHandlerTemplate,
                // });

                //const responseStr = await this.handleMessageWithAI(
                //    runtime,
                //    withPreContext,
                //    memory
                //);
                let responseStr = `收到啦，任务【${taskId}】已开始执行，预计需要几分钟，请耐心等待`;
                if (!taskWaitMode) {
                    const quickJson = await TaskHelper.quickResponse(runtime, memory);
                    if (quickJson && quickJson.quick) {
                        responseStr = quickJson.response;
                        await TaskHelper.setTaskStatus(runtime, taskId, '', true);
                    }
                    else {
                        await TaskHelper.setTaskStatus(runtime, taskId, quickJson.response, false);
                        responseStr = quickJson.response + `\r\n\r\n任务【${taskId}】已开始执行，预计需要几分钟，请耐心等待`;
                        setTimeout(async () => {
                            try {
                                await IntentionHandler.handleDataCollectAPI(runtime, memory);
                            } catch (err) {
                                console.error('Background error ', err);
                            }
                        }, 10);
                    }
                }
                else {
                    responseStr = await IntentionHandler.handleDataCollectAPI(runtime, memory);
                }
                this.concurrentNum--;

                // const parsedContent = parseJSONObjectFromText(
                //     responseStr
                // ) as Content;
                const parsedContent: Content = {
                    text: responseStr,
                    // attachments,
                    attachments: [],
                    source: "direct",
                    inReplyTo: messageId,
                };
                // const response = await generateMessageResponse({
                //     runtime: runtime,
                //     context,
                //     modelClass: ModelClass.LARGE,
                // });

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
                //                 const finalAnswerStr = await handleProtocolsProcessing(
                //     runtime,
                //     originQuestingText,
                //     taskId
                // );
                res.json({
                    user: "Data3",
                    text: responseStr,
                    taskId,
                    action: "NONE",
                });
                return;
            }
        );

        this.app.post(
            "/:agentId/datahub",
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const username = req.body.userId ?? "user";
                const userId = UserKnowledge.getUserIdFromRequest(req.body?.userId);;
                const roomId = stringToUuid("default-data-room-" + username);

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

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

                let responseStr = await IntentionHandler.handleDataHub(runtime, memory);

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
                return;
            }
        );

        this.app.post(
            "/:agentId/download",
            // upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                console.log("downloading, body: ", req.body);
                const agentId = req.params.agentId;
                const roomId = stringToUuid(
                    req.body.roomId ?? "default-room-" + agentId
                );
                const userId = stringToUuid(req.body.userId ?? "user");

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const file_type = req.body.file_type;
                const taskId = req.body.taskId;
                const verify_code = req.body.verify_code;

                console.log("downloading: ", file_type, taskId, verify_code);
                if (verify_code !== stringToHash4(taskId)) {
                    res.status(404).send("verify_code not match");
                    return;
                }

                // download the latest report.
                let lastestExistsFilepath = "";
                let pdfFilepath = "";

                if ("report_pdf" === file_type) {
                    // There may be multiple reports, starting from 1 and growing naturally to 2, 3, 4, 5...,10;
                    for (let i = 1; i <= 10; i++) {
                        const filename = taskId + `_report${i}.txt`;
                        const filePdfname = taskId + `_report${i}.pdf`;
                        // const filename = 'abc.pdf'; // Test: can also download pdf.
                        const filePath = path.join(
                            process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
                            "data",
                            filename
                        );
                        if (fs.existsSync(filePath)) {
                            lastestExistsFilepath = filePath;
                            pdfFilepath = path.join(
                                process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
                                "data",
                                filePdfname
                            );
                        } else {
                            break;
                        }
                    }

                    if (fs.existsSync(lastestExistsFilepath)) {
                        if (!fs.existsSync(pdfFilepath)) {
                            await convertMarkdownToPdf(
                                lastestExistsFilepath,
                                pdfFilepath
                            );
                        }
                        if (fs.existsSync(pdfFilepath)) {
                            res.download(pdfFilepath, () => {});
                            console.log("downloading: " + pdfFilepath);
                            return;
                        }

                        res.download(lastestExistsFilepath, () => {});
                        console.log("downloading: " + lastestExistsFilepath);
                        return;
                    } else {
                        console.log(
                            "not exist filePath: " + lastestExistsFilepath
                        );
                        res.status(404).send(
                            "File not found filePath: " + lastestExistsFilepath
                        );
                    }
                } else if ("report" === file_type) {
                    // There may be multiple reports, starting from 1 and growing naturally to 2, 3, 4, 5...,10;
                    for (let i = 1; i <= 10; i++) {
                        const filename = taskId + `_report${i}.txt`;
                        const filePdfname = taskId + `_report${i}.pdf`;
                        // const filename = 'abc.pdf'; // Test: can also download pdf.
                        const filePath = path.join(
                            process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
                            "data",
                            filename
                        );
                        if (fs.existsSync(filePath)) {
                            lastestExistsFilepath = filePath;
                            pdfFilepath = path.join(
                                process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
                                "data",
                                filePdfname
                            );
                        } else {
                            break;
                        }
                    }

                    if (fs.existsSync(lastestExistsFilepath)) {
                        if (!fs.existsSync(pdfFilepath)) {
                            // TODO: The function costs too much time.
                            // await convertMarkdownToPdf(
                            //     lastestExistsFilepath,
                            //     pdfFilepath
                            // );
                        }
                        if (fs.existsSync(pdfFilepath)) {
                            res.download(pdfFilepath, () => {});
                            console.log("downloading: " + pdfFilepath);
                            return;
                        }

                        res.download(lastestExistsFilepath, () => {});
                        console.log("downloading: " + lastestExistsFilepath);
                        return;
                    } else {
                        console.log(
                            "not exist filePath: " + lastestExistsFilepath
                        );
                        res.status(404).send(
                            "File not found filePath: " + lastestExistsFilepath
                        );
                    }
                } else if ("data" === file_type) {
                    const filename = taskId + `_data.txt`;
                    // const filename = 'abc.pdf'; // Test: can also download pdf.
                    const filePath = path.join(
                        process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
                        "data",
                        filename
                    );
                    if (fs.existsSync(filePath)) {
                        res.download(filePath, () => {
                            // auto delete file( if need)
                            //   fs.unlinkSync(filePath);
                        });
                        console.log("downloading: " + filePath);
                    } else {
                        console.log("not exist filePath: " + filePath);
                        res.status(404).send(
                            "File not found filePath: " + filePath
                        );
                    }
                } else {
                    res.status(404).send(
                        "File file_type not support: " + file_type
                    );
                }

                return;
            }
        );

        this.app.post(
            "/:agentId/data3", // This is a debug API for Data3 Protocols.
            upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const roomId = stringToUuid(
                    req.body.roomId ?? "default-room-" + agentId
                );
                const userId = stringToUuid(req.body.userId ?? "user");

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const text = req.body.text;
                // if empty text, directly return
                if (!text) {
                    res.json([]);
                    return;
                }

                const content: Content = {
                    text: text,
                    intention: {
                        taskId: req.body.taskId || 'Task-Data3-Get'
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
                    id: stringToUuid(userId + Date.now().toString()),
                    ...userMessage,
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                handleProtocolsProcessing(
                    runtime,
                    " ",
                    memory
                ).then((resStr) => {
                    res.json({ res: resStr });
                });
            }
        );

        this.app.post(
            "/:agentId/data3_update",
            // upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const roomId = stringToUuid(
                    req.body.roomId ?? "default-room-" + agentId
                );
                const userId = stringToUuid(req.body.userId ?? "user");

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const newXDataSourceArray = req.body.XData_Collection;
                // // if empty text, directly return
                if (!newXDataSourceArray || newXDataSourceArray.length === 0) {
                    res.json({ res: "empty" });
                    return;
                }

                updateProtocolArray(runtime, newXDataSourceArray);
                res.json({ res: "ok" });
                return;
            }
        );

        this.app.post(
            "/:agentId/data3_get",
            // upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const roomId = stringToUuid(
                    req.body.roomId ?? "default-room-" + agentId
                );
                const userId = stringToUuid(req.body.userId ?? "user");
                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );
                const oldXDataSourceArray = await getProtocolArray(runtime);

                // const oldXDataSourceArray = await runtime.cacheManager.get(
                //     "XData_Collection"
                // );
                // data3Logger.log("oldXData: ", oldXDataSourceArray);
                // data3Logger.log("oldXData id1: " , oldXDataSourceArray[1]);
                res.json({ XData_Collection: oldXDataSourceArray });
                return;
            }
        );

        const templateHandler = new PromptController(this);
        this.app.get(
            "/:agentId/prompt_templates",
            async (req: express.Request, res: express.Response) => {
                await templateHandler.handlePromptTemplates(req, res);
            }
        );
        this.app.post(
            "/:agentId/add_knowledge",
            async (req: express.Request, res: express.Response) => {
                await templateHandler.handleAddKnowledge(req, res);
            }
        );
        this.app.get(
            "/:agentId/read_knowledge",
            async (req: express.Request, res: express.Response) => {
                await templateHandler.handleReadKnowledge(req, res);
            }
        );
        this.app.post(
            "/:agentId/switch_model",
            async (req: express.Request, res: express.Response) => {
                await templateHandler.handleSwitchModelProvider(req, res);
            }
        );

        const routineController = new RoutineController(this);
        this.app.post(
            "/:agentId/routine",
            async (req: express.Request, res: express.Response) => {
                await routineController.handleRoutine(req, res);
            }
        );

        const wechatHandler = new WechatHandler(this);
        this.app.get(
            "/:agentId/wechat_listen",
            async (req: express.Request, res: express.Response) => {
                await wechatHandler.handleWechatInputMessage(req, res);
            }
        );
        this.app.post(
            "/:agentId/wechat_listen",
            async (req: express.Request, res: express.Response) => {
                await wechatHandler.handleWechatInputMessage(req, res);
            }
        );
        this.app.get(
            "/:agentId/wecom_auth",
            async (req: express.Request, res: express.Response) => {
                await wechatHandler.handleWecomAuth(req, res);
            }
        );
        this.app.get(
            "/:agentId/task_status",
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                let runtime = this.agents.get(agentId);
                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }
                try {
                    //const status = await runtime.cacheManager.get(
                    //    req.query.taskId + "_memory_by_step"
                    //);
                    const taskId = req.query.taskId;
                    if (taskId) {
                        const status = await TaskHelper.getTaskStatus(runtime, taskId as string);
                        res.json({ task_status: status });
                    }
                    else {
                        res.status(400).send("Params error.");
                    }
                    return;
                } catch (err) {
                    console.error(err);
                    res.status(500).send("Unknown error: " + err.message);
                }
            }
        );

        this.app.post(
            "/agents/:agentIdOrName/hyperfi/v1",
            async (req: express.Request, res: express.Response) => {
                // get runtime
                const agentId = req.params.agentIdOrName;
                let runtime = this.agents.get(agentId);
                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }
                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                // can we be in more than one hyperfi world at once
                // but you may want the same context is multiple worlds
                // this is more like an instanceId
                const roomId = stringToUuid(req.body.roomId ?? "hyperfi");

                const body = req.body;

                // hyperfi specific parameters
                let nearby = [];
                let availableEmotes = [];

                if (body.nearby) {
                    nearby = body.nearby;
                }
                if (body.messages) {
                    // loop on the messages and record the memories
                    // might want to do this in parallel
                    for (const msg of body.messages) {
                        const parts = msg.split(/:\s*/);
                        const mUserId = stringToUuid(parts[0]);
                        await runtime.ensureConnection(
                            mUserId,
                            roomId, // where
                            parts[0], // username
                            parts[0], // userScreeName?
                            "hyperfi"
                        );
                        const content: Content = {
                            text: parts[1] || "",
                            attachments: [],
                            source: "hyperfi",
                            inReplyTo: undefined,
                        };
                        const memory: Memory = {
                            id: stringToUuid(msg),
                            agentId: runtime.agentId,
                            userId: mUserId,
                            roomId,
                            content,
                        };
                        await runtime.messageManager.createMemory(memory);
                    }
                }
                if (body.availableEmotes) {
                    availableEmotes = body.availableEmotes;
                }

                const content: Content = {
                    // we need to compose who's near and what emotes are available
                    text: JSON.stringify(req.body),
                    attachments: [],
                    source: "hyperfi",
                    inReplyTo: undefined,
                };

                const userId = stringToUuid("hyperfi");
                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                let template = hyperfiHandlerTemplate;
                template = template.replace(
                    "{{emotes}}",
                    availableEmotes.join("|")
                );
                template = template.replace("{{nearby}}", nearby.join("|"));
                const context = composeContext({
                    state,
                    template,
                });

                function createHyperfiOutSchema(
                    nearby: string[],
                    availableEmotes: string[]
                ) {
                    const lookAtSchema =
                        nearby.length > 1
                            ? z
                                  .union(
                                      nearby.map((item) => z.literal(item)) as [
                                          z.ZodLiteral<string>,
                                          z.ZodLiteral<string>,
                                          ...z.ZodLiteral<string>[]
                                      ]
                                  )
                                  .nullable()
                            : nearby.length === 1
                            ? z.literal(nearby[0]).nullable()
                            : z.null(); // Fallback for empty array

                    const emoteSchema =
                        availableEmotes.length > 1
                            ? z
                                  .union(
                                      availableEmotes.map((item) =>
                                          z.literal(item)
                                      ) as [
                                          z.ZodLiteral<string>,
                                          z.ZodLiteral<string>,
                                          ...z.ZodLiteral<string>[]
                                      ]
                                  )
                                  .nullable()
                            : availableEmotes.length === 1
                            ? z.literal(availableEmotes[0]).nullable()
                            : z.null(); // Fallback for empty array

                    return z.object({
                        lookAt: lookAtSchema,
                        emote: emoteSchema,
                        say: z.string().nullable(),
                        actions: z.array(z.string()).nullable(),
                    });
                }

                // Define the schema for the expected output
                const hyperfiOutSchema = createHyperfiOutSchema(
                    nearby,
                    availableEmotes
                );

                // Call LLM
                const response = await generateObject({
                    runtime,
                    context,
                    modelClass: ModelClass.SMALL, // 1s processing time on openai small
                    schema: hyperfiOutSchema,
                });

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                let hfOut;
                try {
                    hfOut = hyperfiOutSchema.parse(response.object);
                } catch {
                    data3Logger.error(
                        "cant serialize response",
                        response.object
                    );
                    res.status(500).send("Error in LLM response, try again");
                    return;
                }

                // do this in the background
                new Promise((resolve) => {
                    const contentObj: Content = {
                        text: hfOut.say,
                    };

                    if (hfOut.lookAt !== null || hfOut.emote !== null) {
                        contentObj.text += ". Then I ";
                        if (hfOut.lookAt !== null) {
                            contentObj.text += "looked at " + hfOut.lookAt;
                            if (hfOut.emote !== null) {
                                contentObj.text += " and ";
                            }
                        }
                        if (hfOut.emote !== null) {
                            contentObj.text = "emoted " + hfOut.emote;
                        }
                    }

                    if (hfOut.actions !== null) {
                        // content can only do one action
                        contentObj.action = hfOut.actions[0];
                    }

                    // save response to memory
                    const responseMessage = {
                        ...userMessage,
                        userId: runtime.agentId,
                        content: contentObj,
                    };

                    runtime.messageManager
                        .createMemory(responseMessage)
                        .then(() => {
                            const messageId = stringToUuid(
                                Date.now().toString()
                            );
                            const memory: Memory = {
                                id: messageId,
                                agentId: runtime.agentId,
                                userId,
                                roomId,
                                content,
                                createdAt: Date.now(),
                            };

                            // run evaluators (generally can be done in parallel with processActions)
                            // can an evaluator modify memory? it could but currently doesn't
                            runtime.evaluate(memory, state).then(() => {
                                // only need to call if responseMessage.content.action is set
                                if (contentObj.action) {
                                    // pass memory (query) to any actions to call
                                    runtime.processActions(
                                        memory,
                                        [responseMessage],
                                        state,
                                        async (_newMessages) => {
                                            // FIXME: this is supposed override what the LLM said/decided
                                            // but the promise doesn't make this possible
                                            //message = newMessages;
                                            return [memory];
                                        }
                                    ); // 0.674s
                                }
                                resolve(true);
                            });
                        });
                });
                res.json({ response: hfOut });
            }
        );

        this.app.post(
            "/:agentId/image",
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const agent = this.agents.get(agentId);
                if (!agent) {
                    res.status(404).send("Agent not found");
                    return;
                }

                const images = await generateImage({ ...req.body }, agent);
                const imagesRes: { image: string; caption: string }[] = [];
                if (images.data && images.data.length > 0) {
                    for (let i = 0; i < images.data.length; i++) {
                        const caption = await generateCaption(
                            { imageUrl: images.data[i] },
                            agent
                        );
                        imagesRes.push({
                            image: images.data[i],
                            caption: caption.title,
                        });
                    }
                }
                res.json({ images: imagesRes });
            }
        );

        this.app.post(
            "/fine-tune",
            async (req: express.Request, res: express.Response) => {
                try {
                    const response = await fetch(
                        "https://api.bageldb.ai/api/v1/asset",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-API-KEY": `${process.env.BAGEL_API_KEY}`,
                            },
                            body: JSON.stringify(req.body),
                        }
                    );

                    const data = await response.json();
                    res.json(data);
                } catch (error) {
                    res.status(500).json({
                        error: "Please create an account at bakery.bagel.net and get an API key. Then set the BAGEL_API_KEY environment variable.",
                        details: error.message,
                    });
                }
            }
        );
        this.app.get(
            "/fine-tune/:assetId",
            async (req: express.Request, res: express.Response) => {
                const assetId = req.params.assetId;

                const ROOT_DIR = path.join(process.cwd(), "downloads");
                const downloadDir = path.resolve(ROOT_DIR, assetId);

                if (!downloadDir.startsWith(ROOT_DIR)) {
                    res.status(403).json({
                        error: "Invalid assetId. Access denied.",
                    });
                    return;
                }
                data3Logger.log("Download directory:", downloadDir);

                try {
                    data3Logger.log("Creating directory...");
                    await fs.promises.mkdir(downloadDir, { recursive: true });

                    data3Logger.log("Fetching file...");
                    const fileResponse = await fetch(
                        `https://api.bageldb.ai/api/v1/asset/${assetId}/download`,
                        {
                            headers: {
                                "X-API-KEY": `${process.env.BAGEL_API_KEY}`,
                            },
                        }
                    );

                    if (!fileResponse.ok) {
                        throw new Error(
                            `API responded with status ${
                                fileResponse.status
                            }: ${await fileResponse.text()}`
                        );
                    }

                    data3Logger.log("Response headers:", fileResponse.headers);

                    const fileName =
                        fileResponse.headers
                            .get("content-disposition")
                            ?.split("filename=")[1]
                            ?.replace(/"/g, /* " */ "") || "default_name.txt";

                    data3Logger.log("Saving as:", fileName);

                    const arrayBuffer = await fileResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const filePath = path.join(downloadDir, fileName);
                    data3Logger.log("Full file path:", filePath);

                    await fs.promises.writeFile(
                        filePath,
                        new Uint8Array(buffer)
                    );

                    // Verify file was written
                    const stats = await fs.promises.stat(filePath);
                    data3Logger.log(
                        "File written successfully. Size:",
                        stats.size,
                        "bytes"
                    );

                    res.json({
                        success: true,
                        message: "Single file downloaded successfully",
                        downloadPath: downloadDir,
                        fileCount: 1,
                        fileName: fileName,
                        fileSize: stats.size,
                    });
                } catch (error) {
                    data3Logger.error("Detailed error:", error);
                    res.status(500).json({
                        error: "Failed to download files from BagelDB",
                        details: error.message,
                        stack: error.stack,
                    });
                }
            }
        );

        this.app.post("/:agentId/speak", async (req, res) => {
            const agentId = req.params.agentId;
            const roomId = stringToUuid(
                req.body.roomId ?? "default-room-" + agentId
            );
            const userId = stringToUuid(req.body.userId ?? "user");
            const text = req.body.text;

            if (!text) {
                res.status(400).send("No text provided");
                return;
            }

            let runtime = this.agents.get(agentId);

            // if runtime is null, look for runtime with the same name
            if (!runtime) {
                runtime = Array.from(this.agents.values()).find(
                    (a) =>
                        a.character.name.toLowerCase() === agentId.toLowerCase()
                );
            }

            if (!runtime) {
                res.status(404).send("Agent not found");
                return;
            }

            try {
                // Process message through agent (same as /message endpoint)
                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const messageId = stringToUuid(Date.now().toString());

                const content: Content = {
                    text,
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
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(memory);

                const state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                const context = composeContext({
                    state,
                    template: messageHandlerTemplate,
                });

                const response = await generateMessageResponse({
                    runtime: runtime,
                    context,
                    modelClass: ModelClass.LARGE,
                });

                // save response to memory
                const responseMessage = {
                    ...userMessage,
                    userId: runtime.agentId,
                    content: response,
                };

                await runtime.messageManager.createMemory(responseMessage);

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                await runtime.evaluate(memory, state);

                const _result = await runtime.processActions(
                    memory,
                    [responseMessage],
                    state,
                    async () => {
                        return [memory];
                    }
                );

                // Get the text to convert to speech
                const textToSpeak = response.text;

                // Convert to speech using ElevenLabs
                const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
                const apiKey = process.env.ELEVENLABS_XI_API_KEY;

                if (!apiKey) {
                    throw new Error("ELEVENLABS_XI_API_KEY not configured");
                }

                const speechResponse = await fetch(elevenLabsApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "xi-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        text: textToSpeak,
                        model_id:
                            process.env.ELEVENLABS_MODEL_ID ||
                            "eleven_multilingual_v2",
                        voice_settings: {
                            stability: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STABILITY || "0.5"
                            ),
                            similarity_boost: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST ||
                                    "0.9"
                            ),
                            style: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                            ),
                            use_speaker_boost:
                                process.env
                                    .ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                                "true",
                        },
                    }),
                });

                if (!speechResponse.ok) {
                    throw new Error(
                        `ElevenLabs API error: ${speechResponse.statusText}`
                    );
                }

                const audioBuffer = await speechResponse.arrayBuffer();

                // Set appropriate headers for audio streaming
                res.set({
                    "Content-Type": "audio/mpeg",
                    "Transfer-Encoding": "chunked",
                });

                res.send(Buffer.from(audioBuffer));
            } catch (error) {
                data3Logger.error(
                    "Error processing message or generating speech:",
                    error
                );
                res.status(500).json({
                    error: "Error processing message or generating speech",
                    details: error.message,
                });
            }
        });

        this.app.post("/:agentId/tts", async (req, res) => {
            const text = req.body.text;

            if (!text) {
                res.status(400).send("No text provided");
                return;
            }

            try {
                // Convert to speech using ElevenLabs
                const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
                const apiKey = process.env.ELEVENLABS_XI_API_KEY;

                if (!apiKey) {
                    throw new Error("ELEVENLABS_XI_API_KEY not configured");
                }

                const speechResponse = await fetch(elevenLabsApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "xi-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        text,
                        model_id:
                            process.env.ELEVENLABS_MODEL_ID ||
                            "eleven_multilingual_v2",
                        voice_settings: {
                            stability: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STABILITY || "0.5"
                            ),
                            similarity_boost: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST ||
                                    "0.9"
                            ),
                            style: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                            ),
                            use_speaker_boost:
                                process.env
                                    .ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                                "true",
                        },
                    }),
                });

                if (!speechResponse.ok) {
                    throw new Error(
                        `ElevenLabs API error: ${speechResponse.statusText}`
                    );
                }

                const audioBuffer = await speechResponse.arrayBuffer();

                res.set({
                    "Content-Type": "audio/mpeg",
                    "Transfer-Encoding": "chunked",
                });

                res.send(Buffer.from(audioBuffer));
            } catch (error) {
                data3Logger.error(
                    "Error processing message or generating speech:",
                    error
                );
                res.status(500).json({
                    error: "Error processing message or generating speech",
                    details: error.message,
                });
            }
        });
    }

    public async handleMessageWithAI(
        runtime: IAgentRuntime,
        withPreContext: boolean,
        message: Memory
    ): Promise<string> {
        const originQuestingText = message.content.text;
        const taskId = message.content.intention?.taskId || "";
        console.log(
            "handleMessageWithAI originQuestingText:  ",
            originQuestingText
        );
        if (!originQuestingText) {
            return null;
        }

        // context(chat history & background knowledge) length not exceed 20k
        const baseUserInfo = await this.composePrompt(
            runtime,
            originQuestingText,
            message.userId,
        );
        const promptInjectBaseUserInfo = baseUserInfo.slice(0, 20000);
        console.log(`handleProtocolsForQuickResponce promptInjectBaseInfo:  
        ============================begin===========================\n
        ${promptInjectBaseUserInfo}
        ===========================end============================\n`);

        // Get lastest memory // refresh taskQuestionObj
        let taskQuestionObj = (await runtime.cacheManager.get(
            "XData_task_question_" + taskId
        )) as TaskQuestionObj | undefined;
        if (!taskQuestionObj) {
            taskQuestionObj = {
                questionText: "",
                promptModifyNum: 0,
                taskId: taskId,
                prevQuestionText: "",
            };
        }

        /**
         * QuestionObj{
         *    questionText: string,
         *    promptModifyNum: number,
         *    taskId: string,
         * }
         * key in cache: XData_task_question_{taskId}
         */

        console.log(
            "before append, taskQuestionObj: promptModifyNum : " +
                JSON.stringify(taskQuestionObj)
        );
        if (!withPreContext) {
            //console.log(originQuestingText);
            //originQuestingText = await this.composePrompt(runtime, originQuestingText, userId);
            //console.log("New: " + originQuestingText);
            const quickResponse = await handleProtocolsForQuickResponce(
                runtime,
                promptInjectBaseUserInfo,
                message
            );
            if (quickResponse) {
                // Priority use quick responce
                taskQuestionObj.prevQuestionText = originQuestingText;
                await runtime.cacheManager.set(
                    "XData_task_question_" + taskId,
                    taskQuestionObj
                );
                return quickResponse;
            }
        }

        if (taskQuestionObj?.promptModifyNum <= 1) {
            // {need_more: true; additional1: question1; additional2: question1; }
            if (
                !taskQuestionObj?.questionText &&
                !taskQuestionObj?.prevQuestionText
            ) {
                taskQuestionObj.questionText = originQuestingText;
            } else {
                let promt1 = `Please summarize the user's original question and additional information in one sentence. A one-sentence summary is sufficient, no explanation is needed.
                    This sentence should not be a summary, but rather a statement from the user's perspective that a question or task has been raised to the AI Agent.`;

                if (taskQuestionObj?.questionText) {
                    promt1 +=
                        "User's original question " +
                        taskQuestionObj.questionText +
                        ". Additional information: " +
                        originQuestingText;
                    if (taskQuestionObj?.prevQuestionText) {
                        promt1 +=
                            `.\nUser Previous Question(No need to answer, just provide context) \n` +
                            taskQuestionObj.prevQuestionText;
                    }
                } else {
                    promt1 += "User's original question " + originQuestingText;
                    if (taskQuestionObj?.prevQuestionText) {
                        promt1 +=
                            `.\nUser Previous Question(No need to answer, just provide context)\n` +
                            taskQuestionObj.prevQuestionText;
                    }
                }

                try {
                    const questionAfter = await generateText({
                        runtime,
                        context: promt1,
                        modelClass: ModelClass.MEDIUM,
                    });
                    console.log(
                        `[[Refine with Additional: Question: ${taskQuestionObj.questionText} +++++  Additional: ${originQuestingText} ====>  ${questionAfter} ]]`
                    );
                    taskQuestionObj.questionText = questionAfter;
                    await runtime.cacheManager.set(
                        // Set the new taskQuestionObj to cache.
                        "XData_task_question_" + taskId,
                        taskQuestionObj
                    );
                } catch (error) {
                    console.error("handleProtocols error: ", error);
                    return "system error 1001";
                }
            }

            if (taskQuestionObj?.promptModifyNum < 1) {
                let promptQuestion =
                    `Current questions that need to be answered: ` +
                    taskQuestionObj.questionText;
                if (taskQuestionObj.prevQuestionText) {
                    promptQuestion +=
                        `. You don't need to answer the previous questions, they are just provided to provide you with context: ` +
                        taskQuestionObj.prevQuestionText;
                }

                // console.log(promptQuestion);
                // promptQuestion = await this.composePrompt(
                //     runtime,
                //     promptQuestion,
                //     userId
                // );
                // console.log("New: " + promptQuestion);
                const regex1 = /输出.*简单/;
                const regex2 = /输出.*简洁/;
                const regex3 = /输出.*精炼/;
                const regex4 = /输出.*丰富/;
                const regex5 = /输出.*格式美观/;
                const regex6 = /输出.*论证/;
                const regex7 = /输出.*严谨/;
                const regex8 = /报告.*丰富/;
                const regex9 = /报告.*格式美观/;
                const regex10 = /报告.*论证/;
                const regex11 = /报告.*严谨/;
                let obj = null;

                if (
                    regex1.test(promptQuestion) ||
                    regex2.test(promptQuestion) ||
                    regex3.test(promptQuestion) ||
                    regex4.test(promptQuestion) ||
                    regex5.test(promptQuestion) ||
                    regex6.test(promptQuestion) ||
                    regex7.test(promptQuestion) ||
                    regex8.test(promptQuestion) ||
                    regex9.test(promptQuestion) ||
                    regex10.test(promptQuestion) ||
                    regex11.test(promptQuestion)
                ) {
                    obj = {
                        need_more: false,
                        taskId,
                    };
                } else {
                    obj = {
                        need_more: true,
                        question_description:
                            "对于这个任务，您偏好的输出风格是什么?",
                        available_options: [
                            "输出内容简洁一些。",
                            "输出的数据丰富、格式美观、论证严谨",
                        ],
                        taskId,
                    };
                }

                // const obj = await handleProtocolsForPrompt(
                //     runtime,
                //     promptQuestion,
                //     taskId
                // );
                taskQuestionObj.promptModifyNum += 1;
                await runtime.cacheManager.set(
                    // Set the new taskQuestionObj to cache.
                    "XData_task_question_" + taskId,
                    taskQuestionObj
                );
                if (obj?.need_more) {
                    return JSON.stringify(obj);
                }
            }

            // taskQuestionObj.promptModifyNum == 2, there is no need to refine the question further.
        }

        // refresh taskQuestionObj
        // taskQuestionObj = await runtime.cacheManager.get("XData_task_question_" + taskId);
        taskQuestionObj = await runtime.cacheManager.get(
            "XData_task_question_" + taskId
        );
        /**
         * MemoryObj{
         *    questionText: string,
         *    promptModifyNum: number,
         *    taskId: string,
         * }
         * key in cache: XData_task_question_{taskId}
         */

        if (taskQuestionObj?.prevQuestionText) {
            let refineQuestionPrompt = `
            Please summarize the user's original question and additional information in one sentence. A one-sentence summary is sufficient, no explanation is needed.
                    This sentence should not be a summary, but rather a statement from the user's perspective that a question or task has been raised to the AI Agent.
            Current-User-Question:${taskQuestionObj.questionText}.
            Previous-User-Question(No need to answer, just provide context): ${taskQuestionObj.prevQuestionText}.
            `;

            console.log(refineQuestionPrompt);
            refineQuestionPrompt = await this.composePrompt(
                runtime,
                refineQuestionPrompt,
                message.userId
            );
            console.log("New: " + refineQuestionPrompt);
            const refineQuestion = await generateText({
                runtime,
                context: refineQuestionPrompt,
                modelClass: ModelClass.MEDIUM,
            });
            console.log(
                `[[Refine with Previous: Cur: ${taskQuestionObj.questionText} +++++  Pre: ${taskQuestionObj.prevQuestionText} ====>  ${refineQuestion} ]]`
            );

            taskQuestionObj.questionText = refineQuestion;
        }

        let finalQuestion = taskQuestionObj.questionText;
        console.log(finalQuestion);
        finalQuestion = await this.composePrompt(
            runtime,
            finalQuestion,
            message.userId
        );
        console.log("New: " + finalQuestion);
        message.content.text = finalQuestion;
        const finalAnswerStr = await handleProtocolsProcessing(
            runtime,
            promptInjectBaseUserInfo,
            // finalQuestion,
            message
        );

        taskQuestionObj = await runtime.cacheManager.get(
            "XData_task_question_" + taskId
        );
        // taskQuestionObj.promptModifyNum = 0;
        if (!taskQuestionObj.prevQuestionText) {
            taskQuestionObj.prevQuestionText = taskQuestionObj.questionText;
        } else {
            taskQuestionObj.prevQuestionText +=
                "\n" + taskQuestionObj.questionText;
        }
        taskQuestionObj.questionText = "";
        await runtime.cacheManager.set(
            // Set the new taskQuestionObj to cache.
            "XData_task_question_" + taskId,
            taskQuestionObj
        );

        const secondaryProcessing =
            "If further processing is needed on this topic, please let me know.";
        const decorateStr = finalAnswerStr + "\n" + secondaryProcessing;
        return decorateStr;
    }

    // agent/src/index.ts:startAgent calls this
    public registerAgent(runtime: IAgentRuntime) {
        // register any plugin endpoints?
        // but once and only once
        this.agents.set(runtime.agentId, runtime);
    }

    public unregisterAgent(runtime: IAgentRuntime) {
        this.agents.delete(runtime.agentId);
    }

    public start(port: number) {
        this.server = this.app.listen(port, () => {
            data3Logger.info(
                `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
            );
        });

        // Handle graceful shutdown
        const gracefulShutdown = () => {
            data3Logger.info("Received shutdown signal, closing server...");
            this.server.close(() => {
                data3Logger.info("Server closed successfully");
                process.exit(0);
            });

            // Force close after 5 seconds if server hasn't closed
            setTimeout(() => {
                data3Logger.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        // Handle different shutdown signals
        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public async stop() {
        if (this.server) {
            this.server.close(() => {
                data3Logger.success("Server stopped");
            });
        }
    }

    private async handleMessage(
        runtime: IAgentRuntime,
        req: Express.Request,
        res: express.Response,
        agentId: string,
        roomId: any,
        userId: any,
        text: string
    ) {
        const messageId = stringToUuid(Date.now().toString());

        const attachments: Media[] = [];
        if ((req as any).file) {
            const filePath = path.join(
                process.cwd(),
                "data",
                "uploads",
                (req as any).file.filename
            );
            attachments.push({
                id: Date.now().toString(),
                url: filePath,
                title: (req as any).file.originalname,
                source: "direct",
                description: `Uploaded file: ${(req as any).file.originalname}`,
                text: "",
                contentType: (req as any).file.mimetype,
            });
        }

        const content: Content = {
            text,
            attachments,
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
            id: stringToUuid(messageId + "-" + userId),
            ...userMessage,
            agentId: runtime.agentId,
            userId,
            roomId,
            content,
            createdAt: Date.now(),
        };

        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);

        let state = await runtime.composeState(userMessage, {
            agentName: runtime.character.name,
        });

        const context = composeContext({
            state,
            template: messageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: runtime,
            context,
            modelClass: ModelClass.LARGE,
        });

        if (!response) {
            res.status(500).send("No response from generateMessageResponse");
            return;
        }

        // save response to memory
        const responseMessage: Memory = {
            id: stringToUuid(messageId + "-" + runtime.agentId),
            ...userMessage,
            userId: runtime.agentId,
            content: response,
            embedding: getEmbeddingZeroVector(),
            createdAt: Date.now(),
        };

        await runtime.messageManager.createMemory(responseMessage);

        state = await runtime.updateRecentMessageState(state);

        let message = null as Content | null;

        await runtime.processActions(
            memory,
            [responseMessage],
            state,
            async (newMessages) => {
                message = newMessages;
                return [memory];
            }
        );

        await runtime.evaluate(memory, state);

        // Check if we should suppress the initial message
        const action = runtime.actions.find((a) => a.name === response.action);
        const shouldSuppressInitialMessage = action?.suppressInitialMessage;

        if (!shouldSuppressInitialMessage) {
            if (message) {
                res.json([response, message]);
            } else {
                res.json([response]);
            }
        } else {
            if (message) {
                res.json([message]);
            } else {
                res.json([]);
            }
        }
    }

    async composePrompt(
        runtime: IAgentRuntime,
        prompt: string,
        userId: UUID
    ): Promise<string> {
        const roomId = stringToUuid("default-data-room-" + userId);
        if (!runtime) {
            throw new Error("Agent not found");
        }
        const userMessage = {
            content: { text: prompt },
            userId,
            roomId,
            agentId: runtime.agentId,
        };
        //console.debug("userMessage: ", userMessage, userId);

        return (
            prompt +
            composeContext({
                state: await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                }),
                template: dataHandlerTemplate,
            })
        );
    }
}

export const DirectClientInterface: Client = {
    name: "direct",
    config: {},
    start: async (_runtime: IAgentRuntime) => {
        data3Logger.log("DirectClientInterface start");
        const client = new DirectClient();
        const serverPort = Number.parseInt(settings.SERVER_PORT || "3000");
        client.start(serverPort);
        return client;
    },
    // stop: async (_runtime: IAgentRuntime, client?: Client) => {
    //     if (client instanceof DirectClient) {
    //         client.stop();
    //     }
    // },
};

const directPlugin: Plugin = {
    name: "direct",
    description: "Direct client",
    clients: [DirectClientInterface],
};
export default directPlugin;

const convertMarkdownToPdf = async (inputFilePath, outputFilePath) => {
    try {
        const cssPath = path.join(process.cwd(), "github-markdown.css");
        const cssContent = await fs.readFileSync(cssPath, "utf-8");
        const config = {
            css: cssContent,
            launch_options: {
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                ],
                headless: true,
                executablePath: process.env.CHROMIUM_PATH,
            },
            pdf_options: {
                format: "A4" as const,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm",
                },
                printBackground: true,
            },
            body: {
                fontFamily:
                    "'Source Han Sans CN', 'Microsoft YaHei', sans-serif",
            },
        };

        const pdf = await mdToPdf({ path: inputFilePath }, config);
        await fs.promises.writeFile(outputFilePath, pdf.content);
        console.log("PDF generated successfully");
    } catch (error) {
        console.error("Conversion failed:", error.message);
    }
};