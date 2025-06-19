import { generateText, ModelClass, type Memory } from "@data3os/agentcontext";
import { generateTextWithFile } from "./aichatwithfiles";
import fs from "fs";
import path from "path";
import { data3Fetch } from "data3-scraper";

import axios from "axios";
import {
    appendToChatCache,
    readCacheFile,
    updateCacheText,
} from "./filehelper";
import APIWrapperFactory from "./apiwrapper";
import { PdfHelper } from "./pdfhelper";
import { KeyWordGenerator } from "./keywords";
import { IntentionHandler } from "./intention";
import { TaskHelper } from "./task";
//import { fileURLToPath } from 'url';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

/**
 * GPT 4.1 mini token limit: 1M Tokens
 * 1 token is about 4 chars.
 * */
// const charLengthLimit = 500000; // openai
const charLengthLimit = 240000; // deepseek

export const getProtocolArray = async (runtime: any) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("getProtocolArray Data: ", oldXDataSourceArray);
    return oldXDataSourceArray ?? [];
};

export const updateProtocolArray = async (
    runtime: any,
    newXDataSourceArray
) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("updateProtocolArray oldXData: ", oldXDataSourceArray);
    if (newXDataSourceArray.length > 0) {
        await runtime.cacheManager.set("XData_Collection", newXDataSourceArray);
    }
};

/**
 * It is divided into 3 parts:
 *  1. Optimize prompt words: add background and refine the problem, func handleProtocolsForPrompt(...).
 *  2. Collect data and analyze the problem, func handleProtocolsProcessing(...).
 *  3. Output the results and prompt secondary processing, func handleProtocolsOutput(...).
 */

/**
 * Features of ChatGPT models:
 * 1. Prioritize reasoning accuracy:
 * choose o1-preview (complex tasks) or o1-mini (fast requirements).
 * 2. Multimodality and real-time:
 * choose GPT-4o, suitable for scenarios such as creativity and customer service.
 * 3. Daily low-cost needs:
 * choose GPT-4o-mini, which takes into account both speed and budget
 */

function shortenStr(str) {
    if (str.length > charLengthLimit) {
        return str.slice(0, charLengthLimit);
    }
    return str;
}

/**
 * This is a preprocessing method.
 */
export const handleProtocols = async (runtime: any, originText: any) => {
    handleProtocolsForPrompt(runtime, originText, "xxx");
};

/**
 * This is a preprocessing method.
 * If there is no need to query data, then return the original question text.
 * If you need to query data, return the result of querying the data text and the original question text, and concatenate the prompt
 * words before returning.
 * This part of the logic not require processing of context memory.
 */
export const handleProtocolsForPrompt = async (
    runtime: any,
    originText: any,
    taskId: any
) => {
    const promt1 = `You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks.
You are an interactive AI agent that can have multiple interactions when solving problems.
    You need to help the user solve the following task [Question: ${originText}],
    Before solving the task, in order to solve the problem better and more accurately, please help the user refine and specify the problem description. You are an interactive AI, and at this stage you only need to refine and specify the problem.
    For simple questions, you can ask less or no questions. For a complex question, you need to ask multiple questions. To facilitate user interaction, please ask multiple-choice questions for interaction.
    When optimizing a question's prompt, the main focus should be on refining and specifying the question, and avoid diverging.
    If no additional information is required, please reply with a JSON structure {need_more: false; } , 
    If you need to continue to optimize the task's description reply:{need_more: true,  question_description: xxxxxx, available_options: [additional1, additional2] } eg: {"need_more": true, "question_description": "What platform is the report you want to analyze based on?", "available_options": ["Base Twitter", "Base Ticktok"]},
    You can use interrogative sentences to further refine the user's original question and clarify the user's intent by returning.
    Only JSON data needs to be returned. Data other than JSON does not need to be returned or interpreted.
    `;
    console.log("handleprotocols promt1: ", promt1);
    let response1 = "";
    try {
        response1 = await generateText({
            runtime,
            context: shortenStr(promt1),
            modelClass: ModelClass.MEDIUM,
        });
    } catch (error) {
        console.error("handleProtocols error: ", error);
        return "智能体出错了，请稍后再试";
    }

    console.log("handleProtocols response need_more: ", response1);
    const response1Str = response1.replace(/```json/g, "").replace(/```/g, "");

    /**
     * {
     *  need_more: true;
     *  additional1: question1;
     *  additional2: question2;
     *  additional3: "For other information, you can type";
     *  taskId: taskId;
     * }
     */
    let obj = null;
    try {
        obj = JSON.parse(response1Str);
        obj.additional3 = "For other information, you can type";
        obj.taskId = taskId;
    } catch (e) {
        console.error(
            "JSON parse error:",
            e,
            "\nResponse content:",
            response1Str
        );
        obj = {
            need_more: false,
            error: "Invalid JSON format",
        };
    }
    return obj;
};

/**
 * This is a preprocessing method.
 * If there is no need to query data, then return the original question text.
 * If you need to query data, return the result of querying the data text and the original question text, and concatenate the prompt
 * words before returning.
 * This part of the logic not require processing of context memory.
 */
export const handleProtocolsProcessing = async (
    runtime: any,
    promptInjectBaseUserInfoStr: any,
    message: Memory
) => {
    // Try quick Responce first.
    // let responce = await handleProtocolsForQuickResponce(runtime, originText, taskId);
    // console.log("yykai handleProtocolsForQuickResponce responce: ", responce);
    // if(!responce) {
    //     responce = await handleProtocolsByLongLogic(runtime, originText, taskId);
    // }
    const responce = await handleProtocolsByLongLogic(
        runtime,
        promptInjectBaseUserInfoStr,
        message
    );
    return responce;
};

export const handleProtocolsForQuickResponce = async (
    runtime: any,
    promptInjectBaseUserInfoStr: any,
    message: Memory
) => {
    let responseFinal = null;
    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    const originText = message.content.text;
    const taskId = message.content.intention?.taskId || "";
    function shortenStr(str) {
        if (str.length > charLengthLimit) {
            return str.slice(0, charLengthLimit);
        }
        return str;
    }
    function containsKeywords(text) {
        const keywords = [
            "爆款",
            "爆文",
            "笔记",
            "热搜",
            "热词",
            "热话题",
            "话题",
            "帖子",
            "评论",
            "小红书",
            "抖音",
            "粉丝",
            "回复",
            "品牌方",
            "标题",
            "浏览量",
            "点赞量",
            "收藏",
            "账号",
            "封面",
            "用户ID",
            "hot",
            "viral",
            "trending",
            "post",
            "comment",
            "Redbook",
            "TikTok",
            "Douyin",
            "fans",
            "reply",
            "brand",
            "title",
            "views",
            "likes",
            "collect",
            "account",
            "cover",
            "UserID",
            "note",
            "pageviews",
            "favorites",
            "hot topic",
            "hot search",
        ];

        const lowerText = text.toLowerCase();

        if (
            keywords.some((keyword) =>
                lowerText.includes(keyword.toLowerCase())
            )
        ) {
            return true;
        }

        const pattern1 = /用户.*资料/i;
        const pattern2 = /用户.*ID/i;
        const pattern3 = /查询.*用户/i;

        if (pattern1.test(text) || pattern2.test(text) || pattern3.test(text)) {
            return true;
        }

        return false;
    }

    /**
    * Test cases:
    * console.log(containsKeywords("Redbook的笔记获得很多likes")); // true
    console.log(containsKeywords("USERID是必填字段")); // true
    console.log(containsKeywords("这篇和品牌方无关")); // true
    console.log(containsKeywords("Hello World")); // false
    console.log(containsKeywords("Very Good")); // false
    console.log(containsKeywords("很好，回答的不错")); // false
    */
    const promptInjectBaseUserInfoAndOriginText = `You are a AI data Agent.You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks. You need to answer user's questions based on background knowledge.
    [BACKGROUND KNOWLEDGE: ${promptInjectBaseUserInfoStr}]
    [USER QUESTION: ${originText}]
    `;

    //  // 测试用例：
    // console.log(containsKeywords("Redbook的笔记获得很多likes")); // true（匹配"likes"）
    // console.log(containsKeywords("USERID是必填字段")); // true（匹配"UserID"关键词）
    // console.log(containsKeywords("这篇和品牌方无关")); // true（匹配"品牌方"关键词）
    // console.log(containsKeywords("Hello World")); // false（无匹配）
    // console.log(containsKeywords("Very Good")); // false（无匹配）
    // console.log(containsKeywords("很好，回答的不错")); // false（无匹配）

    // 新增测试用例：
    // console.log(containsKeywords("用户123资料")); // true（匹配"用户.*资料"模式）
    // console.log(containsKeywords("用户abc id是唯一的")); // true（匹配"用户.*ID"模式）
    // console.log(containsKeywords("用户资料很重要")); // true（匹配"用户.*资料"，xxxx可为0字符）
    // console.log(containsKeywords("UserID必须填写")); // true（匹配"UserID"关键词，非新模式）
    // console.log(containsKeywords("ID 资料用户")); // false（不匹配模式，顺序错误）

    /** quick responce, without query data. */
    if (!containsKeywords(originText)) {
        console.log(
            "handleProtocolsForQuickResponce without query data. originText: ",
            originText
        );
        const responce = await generateText({
            runtime,
            context: promptInjectBaseUserInfoAndOriginText,
            modelClass: ModelClass.SMALL,
        });
        return responce;
    }

    if (
        originText.includes("report") ||
        originText.includes("报告") ||
        originText.includes("分析") ||
        originText.includes("仿写") ||
        originText.includes("研究") ||
        originText.includes("research") ||
        originText.includes("评估") ||
        originText.includes("evaluate") ||
        originText.includes("策略") ||
        originText.includes("strategy") ||
        originText.includes("规划") ||
        originText.includes("plan") ||
        originText.includes("方案") ||
        originText.includes("scheme") ||
        originText.includes("写作") ||
        originText.includes("write") ||
        originText.includes("撰写") ||
        originText.includes("compose") ||
        originText.includes("数学") ||
        originText.includes("math") ||
        originText.includes("计算") ||
        originText.includes("calculate") ||
        originText.includes("解决") ||
        originText.includes("solve") ||
        originText.includes("总结") ||
        originText.includes("summarize") ||
        originText.includes("开发") ||
        originText.includes("develop") ||
        originText.includes("设计") ||
        originText.includes("design") ||
        originText.includes("解释") ||
        originText.includes("explain") ||
        originText.includes("预测") ||
        originText.includes("predict") ||
        originText.includes("编辑") ||
        originText.includes("edit") ||
        originText.includes("教学") ||
        originText.includes("teach") ||
        originText.includes("提案") ||
        originText.includes("proposal") ||
        originText.includes("策划") ||
        originText.includes("planning")
    ) {
        return null;
    }
    let promptPartThree = `You are a Data AI agent. You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks.[YOU BACKGROUND KNOWLEDGE:\ ${promptInjectBaseUserInfoStr}]
        [USER QUESTION: ${originText}].
        You need to call once HTTP API request to answer user questions.
        Please analyze the description of the API below. ${JSON.stringify(
            apiXDataSourceArray
        )} , 
        Extracting the parameters of the problem from the user's question, ${originText}, 
        Retrieve from the API description in other parameters. 
        If you decide to use a quick responce mode, please return a JSON object containing the following fields:
        {"quickMode": true,"route": "notes_search","params": {"key1": "v1","key2": "v2", "totalItemCount": 100}}
        This 'totalItemCount' field indicates how many data items the user wants to obtain.
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.
        `;
    let response2 = "";
    try {
        response2 = await generateText({
            runtime,
            context: shortenStr(promptPartThree),
            modelClass: ModelClass.SMALL,
        });
    } catch (error) {
        console.error("handleProtocols error: ", error);
        return null;
    }

    console.log("handleProtocols response2: ", response2);
    const response2Str = response2.replace(/```json/g, "").replace(/```/g, "");
    let searchObj = null;
    try {
        searchObj = JSON.parse(response2Str);

        //Test for KeywordGenerator
        //const subKeywords = await KeyWordGenerator.generateMore(
        //    runtime, searchObj.params?.keyword);
        //console.log(subKeywords);
    } catch (e) {
        console.log("handleProtocols response2Str parse error: ", e);
    }
    console.log(
        `handleProtocols route: ${
            searchObj?.route
        } quick responce apiXDataSourceArray: ${JSON.stringify(
            apiXDataSourceArray
        )} `
    );
    if (!isRouteInAPIArray(searchObj?.route, apiXDataSourceArray)) {
        return `${searchObj?.route} is not in API list.`;
    }

    let apires = null;
    let currentApiStr = "";
    let apiSuccess = false;
    let csvdataurl = null;
    let apires2;
    let csvdataurl2;
    let searchObj2;
    try {
        /********* data3 protocol v1 begin *********
        if (Obj.method == "post") {
            apires = await axios.post(Obj.baseurl, Obj.body, {
                params: Obj.params,
                headers: Obj.headers,
            });
        } else {
            apires = await axios.get(Obj.baseurl, {
                params: Obj.params,
                headers: Obj.headers,
            });
        }
        ********* data3 protocol v1 end *********/

        /********* data3 protocol v2 begin *********/
        console.log("1 handleProtocols Obj: ", searchObj);
        // return {result , csvfileurl };

        const { result, csvfileurl } = await APIWrapperFactory.executeRequest(
            runtime,
            searchObj,
            message
        );

        if (
            (searchObj?.route == "get_note_list" ||
                searchObj?.route == "notes_search") &&
            (originText.includes("评论") ||
                originText.toLocaleLowerCase().includes("comment"))
        ) {
            if (result?.length > 0) {
                const mostCommentedNote = result.reduce((prev, current) =>
                    prev?.comments_count > current?.comments_count
                        ? prev
                        : current
                );

                const comments_count = mostCommentedNote?.comments_count || 0;
                const note_id =
                    mostCommentedNote?.id || mostCommentedNote?.note_id;

                if (comments_count > 0 && note_id) {
                    searchObj2 = {
                        route: "notes_comment_by_next_page",
                        params: {
                            noteId: note_id,
                        },
                    };
                    const { result, csvfileurl } =
                        await APIWrapperFactory.executeRequest(
                            runtime,
                            searchObj2,
                            message
                        );
                    apires2 = result;
                    csvdataurl2 = csvfileurl;
                }
            }
        }
        apires = result;
        csvdataurl = csvfileurl;
        console.log(
            "2 handleProtocols Obj: ",
            JSON.stringify(apires)?.slice(0, 200)
        );
        let content = `\n
        [Question: ${originText}]
        [API: ${JSON.stringify(searchObj)}]
        [Responce: ${JSON.stringify(apires)}].`;

        if (apires2) {
            content += `
        [API2: ${JSON.stringify(searchObj2)}]
        [Responce2: ${JSON.stringify(apires2)}].
        \n`;
        }

        const filename = taskId + "_data.txt";
        appendToChatCache(content, filename, (err) => {
            console.error("Custom error handling:", err);
        });
        apiSuccess = true;
        /********* data3 protocol v2 end *********/
    } catch (e) {
        console.log("handleProtocols error: ", e);
        // chatContextAccmulatingStr += errorStr;
        currentApiStr = `The current API [API: ${JSON.stringify(
            searchObj
        )}] request failed, The responce [Responce: ${e
            .toString()
            .slice(200)}].\n`;
        apiSuccess = false;
    }
    // This is what you want to add
    let content = `You are a Data AI agent. You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks.[BACKGROUND KNOWLEDGE: ${promptInjectBaseUserInfoStr}]
    The user's question, the API used, and the result of the API request are as follows.
    You need to answer the user's question based on the result of the API request.
            [QUESTION: ${originText}]
            [API: ${JSON.stringify(searchObj)}]
            [RESPONCE: ${JSON.stringify(apires)}].
            \n`;
    if (apires2) {
        content += `
        [API2: ${JSON.stringify(searchObj2)}]
        [Responce2: ${JSON.stringify(apires2)}].
        \n`;
    }
    console.log("qucikResponce: prompt: \n " + content);
    try {
        responseFinal = await generateText({
            runtime,
            context: shortenStr(content),
            modelClass: ModelClass.SMALL,
        });
        console.log("quick responce: final: \n" + responseFinal);
    } catch (error) {
        console.error("handleProtocols error: ", error);
        return null;
    }
    // Pdf Test
    /*try {
        const projectRoot = process.cwd();
        console.log('Pdf gen path:', projectRoot);
        const generator = new PdfHelper(projectRoot);
        const pdfPath = await generator.generateFromString(responseFinal, 'test.pdf');
        console.log('Pdf gen success:', pdfPath);
    } catch (err) {
        console.log(err);
    }*/
    if (!apiSuccess) {
        responseFinal +=
            "\nAPI请求出现错误，请在聊天框中输入【人工】，以便人工处理。";
    }
    const finalfilepath = reportPersist(responseFinal, taskId);
    //const responseTail = `\n下载报告地址: ${finalfilepath}\n下载数据地址: ${csvdataurl}\n(您可以把URL粘贴到其他AI大模型聊天框中继续分析一下,数据三天后过期)`;
    // let responseTail = "";
    let responseTail = `\n下载报告地址: ${finalfilepath}`;
    if (!apiSuccess) {
        responseTail = "";
    }
    if (
        responseFinal.length < 200 &&
        (responseFinal.includes("没有找到") ||
            responseFinal.includes("找不到") ||
            responseFinal.includes("没有检索到"))
    ) {
        responseTail = "";
    }

    responseTail += getDynamicTail(taskId);
    console.log(`responseTail:  hot ? : ${containsHotwords(originText)}
    originText: ${originText}`);
    if (containsHotwords(originText) && !responseFinal.includes("【人工】")) {
        const obj = {
            need_more: true,
            question_answer: responseFinal + responseTail,
            available_options: ["参考这些热度较高的帖子进行仿写"],
            taskId,
        };
        return JSON.stringify(obj);
    }

    if (!responseFinal.includes("【人工】")) {
        return responseFinal + responseTail;
    } else {
        return responseFinal;
    }
};

export const handleProtocolsByLongLogic = async (
    runtime: any,
    promptInjectBaseUserInfoStr: any,
    message: Memory
) => {
    const originText = message.content.text;
    const taskId = message.content.intention?.taskId || "";
    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );

    function shortenStr(str) {
        if (str.length > charLengthLimit) {
            console.warn("prompt too long, prompt: str: " + str);
            return str.slice(0, charLengthLimit);
        }
        console.log(`str len:  ${(1.0 * str.length) / 1000} k.`);
        return str;
    }
    const promt1 = ` You are an AI agent. You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks. You need to determine whether the user's question requires an online query.
    [BACKGROUND KNOWLEDGE: ${promptInjectBaseUserInfoStr}]
    Do the following questions need to be queried online?\n
        [QUESTION: ${originText}] \n At the same time, you can read this list of HTTP APIs [APIS: ${JSON.stringify(
        apiXDataSourceArray
    )}.\n
        Please return a Boolean(need_network) value, true or false, to indicate whether this question needs to be queried online.
        Is there a suitable API in the API list to answer the user's question?
        Please return a Boolean(api_available) value, true or false, to indicate whether there is a suitable API for user's question.
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification.
        The JSON format is: {"need_network": true, "api_available": true}\n`;
    let response1 = "";
    try {
        // load memory load and data.
        // chat with the data txt file.
        // const filePath = "chat-cache-file_" + taskId + ".txt";
        // const fileExists = fs.existsSync(filePath);
        // console.log(`online query Chat cache file ${filePath} exists: ${fileExists}`);
        // if(!fileExists) {
        console.log("handleprotocols need query prompt: ", promt1);
        response1 = await generateText({
            runtime,
            context: shortenStr(promt1),
            modelClass: ModelClass.MEDIUM,
        });
        console.log("handleProtocols need query response: ", response1);

        // } else {
        //     response1 = await generateTextWithFile(filePath, shortenStr(promt1));
        // }
        // response1 = await generateText({
        //     runtime,
        //     context: shortenStr(promt1),
        //     modelClass: ModelClass.LARGE,
        // });
    } catch (error) {
        console.error("handleProtocols error: ", error);
        return "智能体出错了，请稍后再试";
    }

    const response1Str = response1.replace(/```json/g, "").replace(/```/g, "");

    let obj = JSON.parse(response1Str);

    let promptPartOne = `
You are a data AI Agent that answers some user questions by querying network data multiple times.
You are operating as a Top-tier Personal Assistant, providing continuous support until the user's issue is completely resolved. Immediately cease responses once resolution is confirmed.
When encountering uncertain problems, you must utilize tools to read and verify content; speculation or fabrication of information is strictly prohibited. If existing data APIs cannot address the user's query, objectively point out the inability to respond due to insufficient data.
Before each tool invocation, fully plan your approach and rigorously combine insights from previous tool results. Avoid relying solely on sequential tool calls to accomplish tasks.
[BACKGROUND KNOWLEDGE: ${promptInjectBaseUserInfoStr}]
[USER ORIGINAL QUESTION: ${originText}]
To make it easier for you to perform long logical inferences, I have mapped out the inference areas in your context.
This is a dynamic reasoning graph that includes the original question, each network request, and the new data collected at each step, as well as future plans, summaries, and reflections.
You Context is divided into three areas, and each area has some blocks.
API request errors also need to be recorded, and they will not be used if the errors occur more than 3 times.
[The first area] is the thinking template I provide for you.
[The second area] is your output according first area. With each loop, Before you thinking, I allow you to access network data until have enough data to ultimately answer the user's question.
[The third area] is the statement that you and I interact with at the current step and current state.

[Area1] :
[Block 0: User's question history, \n Question1: xxx \n Question2: xxx \n ... \n QuestionN: xxx (The latest question)\n]
[Block 1: Plan Block: 1.xxx. 2.xxx. (Clarify the core points of the question (e.g., the definition and scope of xxx).)]
[Block 2: Steps Logs Block: 1.xxx. 2.xxx. (You can record the simple situation and feedback in each step here. The feedback may be positive or negative to help you formulate the next step plan.)]
[Block 3: Data Collected Block: data1, data2, ... (This is a step-by-step result. Your each network request is processed, refined, and collected here. As you collect more and more data, when you have enough data, you can answer the user's question.
Note(Important!): For any questions related to comments, you need to query the notes first, get the note ID inside (note that the note ID should be recorded in the context), and then query the comments by the note ID.
)]
[Block 4: Next step plan Block: xxx (Adjust your plan continuously based on the data you collect.)]
[Block 5: Temporary Block: (1) data1, The temporary results of network requests are organized and refined, and then merged into Part 3. (2) data2, The current output needs to be saved in the current block for the next step of input.]
\n`;
    let promptPartTwo = `[Area2]:
[Block 0: ...]
[Block 1: ...]
[Block 2: ...]
[Block 3: ]
[Block 4: ]
[Block 5: ]`;

    let promptPartThree = `
\n[Area3]:
`; // [The third area] interact Block.

    let step = 0;
    let csvdataurl = null;
    let apiSuccess = false;

    do {
        ++step;
        if (step > 12) {
            console.log(`handleProtocols step: ${step} is too much, break.`);
            break;
        }
        console.log(
            `handleProtocols step: ${step} begin -------------------------------------`
        );
        let chatContextAccmulatingStr =
            promptPartOne + promptPartTwo + promptPartThree;

        if (chatContextAccmulatingStr.length > charLengthLimit) {
            console.log(
                `handleProtocols step: ${step} chatContextAccmulatingStr is too much, break.`
            );
            console.log(
                `handleProtocols step: ${step} end   -------------------------------------`
            );
            break; // context length limit 128k for GPT-4.
        }

        if (!(obj?.need_network == true) || !(obj?.api_available == true)) {
            // STEP: No need to query network data.
            console.log("is continue? ", JSON.stringify(obj));
            console.log(
                `handleProtocols step: ${step} end   -------------------------------------`
            );
            break;
        }

        // STEP: Data Query API selection
        // TODO: This is divided into two parts, first obtaining the category, and then obtaining the specific API.
        promptPartThree = `\n[Area3]\nYou need to call multiple data request interfaces to answer user questions. The following answer should be as tight and brief as possible.
        Please analyze the description of the API below. ${JSON.stringify(
            apiXDataSourceArray
        )} , 
        Extracting the parameters of the problem from the user's question, ${originText}, 
        Retrieve from the API description in other parameters. 
        Please return a JSON object containing the following fields:
        {"route": "notes_search","params": {"key1": "val1", "key2": "val2", "totalItemCount": 100}}
        This 'totalItemCount' field indicates how many data items the user wants to obtain.
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.There is another situation where there is a dependency relationship, and this time you only need to return the interface of the current data. I will add the return result of this data query and origin question text in the next loop. Based on the new return result, you can continue to select the API for network calls and complete the dependency calls.
        At the same time, you also need to retrieve the parameters that may be used in [Area2][Block 5].
        Only one http request interface is returned at a time, and subsequent data can be requested in subsequent loops.
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;

        chatContextAccmulatingStr =
            promptPartOne + promptPartTwo + promptPartThree;
        if (chatContextAccmulatingStr.length > charLengthLimit) {
            console.log(
                `handleProtocols step: ${step} promt2 is too much, break.`
            );
            return chatContextAccmulatingStr;
        }
        let response2 = "";
        try {
            console.log(
                "handleProtocols API Selecting prompt: ",
                shortenStr(chatContextAccmulatingStr)
            );
            response2 = await generateText({
                runtime,
                context: shortenStr(chatContextAccmulatingStr),
                modelClass: ModelClass.MEDIUM,
            });
            console.log("handleProtocols API Selecting response: ", response2);
        } catch (error) {
            console.error("handleProtocols error: ", error);
            return "智能体出错了，请稍后再试";
        }

        const response2Str = response2
            .replace(/```json/g, "")
            .replace(/```/g, "");
        let taskJson = null;
        try {
            taskJson = JSON.parse(response2Str);
            console.log(
                `handleProtocols route: ${
                    taskJson?.route
                } long logic apiXDataSourceArray: ${JSON.stringify(
                    apiXDataSourceArray
                )} `
            );
            if (!isRouteInAPIArray(taskJson?.route, apiXDataSourceArray)) {
                promptPartTwo += `\n ${taskJson?.route} is not in API list, please select another API.`;
            }
        } catch (e) {
            console.log(
                "handleProtocols response2Str parse error: ",
                e.toString().slice(0, 200)
            );
            continue;
        }

        let apires = null;
        let currentApiStr = "";
        let apires2;
        let csvdataurl2;
        let searchObj2;
        try {
            // if (Obj.method == "post") {
            //     apires = await axios.post(Obj.baseurl, Obj.body, {
            //         params: Obj.params,
            //         headers: Obj.headers,
            //     });
            // } else {
            //     apires = await axios.get(Obj.baseurl, {
            //         params: Obj.params,
            //         headers: Obj.headers,
            //     });
            // }
            console.log("3 handleProtocols API call  Obj: ", taskJson);
            const { result, csvfileurl } =
                await APIWrapperFactory.executeRequest(
                    runtime,
                    taskJson,
                    message
                );
            if (
                (taskJson?.route == "get_note_list" ||
                    taskJson?.route == "notes_search") &&
                (originText.includes("评论") ||
                    originText.toLocaleLowerCase().includes("comment"))
            ) {
                if (result?.length > 0) {
                    const note_id = result[0].id || result[0].note_id;
                    if (note_id) {
                        searchObj2 = {
                            route: "notes_comment_by_next_page",
                            params: {
                                noteId: note_id,
                            },
                        };
                        const { result, csvfileurl } =
                            await APIWrapperFactory.executeRequest(
                                runtime,
                                searchObj2,
                                message
                            );
                        apires2 = result;
                        csvdataurl2 = csvfileurl;
                    }
                }
            }
            csvdataurl = csvfileurl;
            apires = result;
            console.log(
                "4 handleProtocols API call res: ",
                JSON.stringify(apires).slice(0, 200)
            );
            // This is what you want to add
            let content = `\n
            [Question: ${originText}]
            [API: ${JSON.stringify(taskJson)}]
            [Responce: ${JSON.stringify(apires)}].
            \n`;
            if (apires2) {
                content += `
        [API2: ${JSON.stringify(searchObj2)}]
        [Responce2: ${JSON.stringify(apires2)}].
        \n`;
            }

            const filename = taskId + "_data.txt";
            appendToChatCache(content, filename, (err) => {
                console.error("Custom error handling:", err);
            });

            promptPartThree = `\n[Area3]\nThe user origin quesiton[Question: ${originText}], The current API [API: ${JSON.stringify(
                taskJson
            )}] Refine the response, You can reduce some unused fields, but don't reduce the total number of querying items.
            Based on the user's question, please remove irrelevant text, remove duplicate text and compress responce.
            For example, if the user's question is not related to the timestamp, the timestamp field can be removed. 
        
            [Responce: ${JSON.stringify(apires)}]
            [Responce2: ${JSON.stringify(apires2)}].\n`;

            // The response str is too long, Use AI to remove irrelevant text and compress it.
            // const promtShorten = apiNeedShortenStr;
            let shortenapires = "";
            try {
                shortenapires = await generateText({
                    // Compress redundant and irrelevant text
                    runtime,
                    context: shortenStr(
                        promptPartOne + promptPartTwo + promptPartThree
                    ),
                    modelClass: ModelClass.MEDIUM,
                });
                // console.log(
                //     `API Response shortten ${JSON.stringify(apires)}\n  >>>>>>>>>>  \n${shortenapires}`
                // );
            } catch (e) {
                console.log("handleProtocols error: ", e);
                return "智能体出错了，请稍后再试";
            }

            currentApiStr = `The current API [API: ${JSON.stringify(
                taskJson
            )}] The responce [Responce: ${shortenapires}].\n`;
            // console.log("handleProtocols promtShorten: ", promtShorten);
            // console.log("handleProtocols currentApiStr: ", currentApiStr);
            //}
            apiSuccess = true;
        } catch (e) {
            console.log("handleProtocols error: ", e);
            // chatContextAccmulatingStr += errorStr;
            currentApiStr = `The current API [API: ${JSON.stringify(
                taskJson
            )}] request failed, The responce [Responce: ${e
                .toString()
                .slice(200)}].\n`;
            apiSuccess = false;

            // const content = `\n
            // [Question: ${originText}]
            // [API: ${JSON.stringify(Obj)}]
            // [Responce: ${JSON.stringify(e.toString().slice(0, 200))}].
            // \n`;

            // const filename = taskId + "_data.txt";
            // appendToChatCache(content, filename, (err) => {
            //     console.error("Custom error handling:", err);
            // });
        }
        // currentAPIResStr += currentApiStr;

        console.log(
            "handleProtocols http res: ",
            JSON.stringify(apires)?.slice(0, 1000)
        );
        // }
        promptPartTwo += `[Block 5: ${currentApiStr}]\n`;
        promptPartThree = `\n[Area3]\nPlease summarize the AI Block 5 to AI Block 3, and then Return Second Area(AI Area). Copy the user's question to the history question Area2-Block 0.`;
        const promptReorganizeThinkGraph = shortenStr(
            promptPartOne + promptPartTwo + promptPartThree
        );
        try {
            promptPartTwo = await generateText({
                runtime,
                context: promptReorganizeThinkGraph,
                modelClass: ModelClass.MEDIUM,
            });
            // save memory
            await runtime.cacheManager.set(
                taskId + "_memory_by_step",
                `current_step: ${step}\n` + promptReorganizeThinkGraph
            );
            updateCacheText(
                promptReorganizeThinkGraph,
                taskId + "_memory.txt",
                (err) => {
                    console.error("Save memory err:", err);
                }
            );
        } catch (e) {
            console.log("handleProtocols error: ", e);
            return "智能体出错了，请稍后再试";
        }
        // if(!apiSuccess) {
        //     console.log(`handleProtocols step: ${step} api failed, break.`);
        //     console.log(`handleProtocols step: ${step} end   -------------------------------------`);
        //     continue;
        // }

        // console.log(
        //     `handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`
        // );

        // Check if the goal is completed
        promptPartThree = `\n[Area3]\n
        Please check if the data above is sufficient to answer the user's question?\n
        You can read this list of HTTP APIs [APIs: ${JSON.stringify(
            apiXDataSourceArray
        )}.\n
        If the collected data is not enough, you need to continue searching online.You need to continue collecting data until the problem is finally solved. For example, if a user needs to find 100 KOLs, but you only find 10, this is not enough.
        There is another situation where you should end the API request. This is when there is insufficient data but there is no suitable API to obtain new data. No new data can be requested by requesting the API again. At this time, it is time to end the request.
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.\n
        Is there a suitable API in the API list to answer the user's question?        Please return a Boolean(need_network) value, true or false, to indicate whether this question needs to be queried online.
        Please return a Boolean(api_available) value, true or false, to indicate whether there is a suitable API for user's question(If an API that has too many errors will not be allowed to be used again). As long as at least one of the APIs listed above is still available, do not return false(api_available) when replenishing data. .
        For the API that can turn pages, you need to call it more than 5 times to get more data.
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification, The JSON format is: {"need_network": true, "api_available": true}\n`;
        let response3 = "";
        try {
            // const filePath = "chat-cache-file_" + taskId + ".txt";
            // const fileExists = fs.existsSync(filePath);
            // console.log(
            //     `online query Chat cache file ${filePath} exists: ${fileExists}`
            // );
            // if (!fileExists) {
            response3 = await generateText({
                runtime,
                context: shortenStr(
                    promptPartOne + promptPartTwo + promptPartThree
                ),
                modelClass: ModelClass.MEDIUM,
            });
            // } else {
            //     response3 = await generateTextWithFile(
            //         filePath,
            //         shortenStr(promptPartOne + promptPartTwo + promptPartThree)
            //     );
            // }
        } catch (e) {
            console.log("handleProtocols error: ", e);
            return "智能体出错了，请稍后再试";
        }

        console.log(
            `handleProtocols is continue? prompt: ${shortenStr(
                promptPartOne + promptPartTwo + promptPartThree
            )}, response: ${response3}`
        );
        const response3Str = response3
            .replace(/```json/g, "")
            .replace(/```/g, "");
        try {
            obj = JSON.parse(response3Str);
        } catch (e) {
            console.log("handleProtocols response3Str parse error: ", e);
            continue;
        }
        // STEP: Reflection
        // chatContextAccmulatingStr = await generateText({
        //     runtime,
        //     context: shortenStr("Summarize and reflect on the following results: [User-Question: xxx][Plan: 1.xxx. 2.xxx. 3.xxx.][Step: 1.xxx. 2.xxx. 3.xxx.][Results has collected: xxxx]" + chatContextAccmulatingStr),
        //     modelClass: ModelClass.LARGE,
        // });
        // console.log(
        //     `handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`
        // );

        console.log(
            `handleProtocols step: ${step} end   -------------------------------------`
        );
    } while (obj);
    promptPartThree = `\n[Area3]\nBased on the above results, answer user questions briefly and directly. The data here may not be sufficient, but first answer the user's question. For example, if the user asked to find 100 KOLs, but now there are only 10, answer the user's question first.`;
    let responseFinal = "";
    try {
        // chat with the data txt file.
        // const filePath = "chat-cache-file_" + taskId + ".txt";
        // const fileExists = fs.existsSync(filePath);
        // console.log(`Chat cache file ${filePath} exists: ${fileExists}`);
        // if(!fileExists) {
        // todo : analyze with data file.
        // const filename = taskId + "_data.txt";
        //     appendToChatCache(content, filename, (err) => {
        //         console.error("Custom error handling:", err);
        //     });
        const data_cached_str = readCacheFile(taskId + "_data.txt");
        const memory_cached_str = readCacheFile(taskId + "_memory.txt");
        const promptQuestionWithData = `You are a data analysis expert specializing in data analysis of the social media platform Xiaohongshu.(RedNote/小红书), with strong market research and user analysis capabilities.
            Not only can you accurately answer data questions raised by the business (descriptive, diagnostic),
            but you can also proactively explore the hidden information in the data, raise valuable business questions and new opportunities (exploratory, predictive, guiding), and through excellent communication, transform data insights into practical actions to drive business growth, optimize user experience, and improve operational efficiency.
            You answer users’ questions directly.
            [USER QUESTION: ${originText}].
            Below is AI reasoning process(The reasoning process is reference information. When answering questions, do not answer the reasoning process. Just answer directly according to the user's question.)
            [REASONING PROCESS: ${memory_cached_str}].
            Below are some data related to user questions, obtained through API queries.
            [API QUERY DATA: ${data_cached_str}]
            [BACKGROUND KNOWLEDGE: ${promptInjectBaseUserInfoStr}].
           `;
        // todo: 异常使用代理处理就好了。
        //              如果 API 出现错误，导致数据查询失败，请你先尽可能的回答用户问题，最后追加一句提示：API请求出现错误，请在聊天框中输入【人工】，以便人工处理。
        responseFinal = await generateText({
            runtime,
            context: shortenStr(promptQuestionWithData),
            modelClass: ModelClass.LARGE,
        });
        console.log(
            "report, prompt: ",
            shortenStr(promptQuestionWithData).slice(0, 300)
        );
        console.log("report: responce: ", responseFinal);

        // } else {
        //     responseFinal = await generateTextWithFile(filePath, shortenStr(promptPartOne + promptPartTwo + promptPartThree));
        // }
        // const content = `AI Agent Memory:\n ${promptPartTwo}`;
        // const filename = taskId + "_memory_.txt";
        // appendToChatCache(content, filename, (err) => {
        //     console.error("Custom error handling:", err);
        // });
    } catch (e) {
        console.log("handleProtocols error: ", e);
        return "智能体出错了，请稍后再试";
    }
    if (!apiSuccess) {
        responseFinal +=
            "\nAPI请求出现错误，请在聊天框中输入【人工】，以便人工处理。";
    }
    const finalfilepath = reportPersist(responseFinal, taskId);
    // const responseTail = `\n下载报告地址: ${finalfilepath}\n下载数据地址：${csvdataurl}\n(您可以把URL粘贴到其他AI大模型聊天框中继续分析一下,数据三天后过期)`;
    let responseTail = `\n下载报告地址: ${finalfilepath}`;
    if (
        responseFinal.length < 200 &&
        (responseFinal.includes("没有找到") ||
            responseFinal.includes("找不到") ||
            responseFinal.includes("未返回任何有效数据") ||
            responseFinal.includes("没有检索到"))
    ) {
        responseTail = "";
    }
    if (!apiSuccess && responseFinal.length < 200) {
        responseTail = "";
    }
    responseTail += getDynamicTail(taskId);
    if (containsHotwords(originText) && !responseFinal.includes("【人工】")) {
        const obj = {
            need_more: true,
            question_answer: responseFinal + responseTail,
            available_options: ["是否需要参考这些热度较高的帖子进行仿写？"],
            taskId,
        };
        return JSON.stringify(obj);
    }
    if (!responseFinal.includes("【人工】")) {
        return responseFinal + responseTail;
    }
    return responseFinal;
};

/**
 * Restart a task.
 */
export const handleProtocolsOutput = async (runtime: any, originText: any) => {
    const responseFinal = `Restart a task.`;
    return responseFinal;
};

function reportPersist(responseFinal: string, taskId: any) {
    let firstUnExistsFilename = "";
    for (let i = 1; i <= 10; i++) {
        const filename = taskId + `_report${i}.txt`;
        // const filename = 'abc.pdf'; // Test: can also download pdf.
        const filePath = path.join(
            process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
            "files",
            filename
        );
        if (!fs.existsSync(filePath)) {
            firstUnExistsFilename = filename;
            break;
        }
    }
    updateCacheText(responseFinal, firstUnExistsFilename, (err) => {
        console.error("Failed to write file:", err);
    });
    return `https://data3.site/media/files/${firstUnExistsFilename}`;
    //return `http://97.64.21.158:3333/media/files/${firstUnExistsFilename}`;
}

function stringToHash4(str) {
    let hash = 0;
    for (let char of str) {
        const code = char.codePointAt(0);
        hash = (hash * 31 + code) % 10000;
    }
    return hash.toString().padStart(4, "0");
}

function containsHotwords(originText: any) {
    const keywords = [
        "爆款",
        "爆文",
        "热搜",
        "热词",
        "热话题",
        "hot",
        "viral",
        "trending",
        "hot topic",
        "hot search",
    ];
    const lowerText = originText.toLowerCase();
    if (keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
        return true;
    }

    const pattern = /(?:热|受欢迎|高点赞).*(?:笔记|帖|文章)/i;
    if (
        pattern.test(originText)
    ) {
        return true;
    }
    return false;
}

function isRouteInAPIArray(routeStr, apiArray) {
    const apiList = apiArray?.[0]?.APIs;
    if (!Array.isArray(apiList)) return false;
    return apiList.some((api) => api.route === routeStr);
}
function getDynamicTail(taskId: string) {
    const textFilePaths = [];
    const excelFilePaths = [];
    for (let i = 1; i <= 10; i++) {
        const filenametxt = taskId + `_raw_data${i}.txt`;
        const filenamexlsx = taskId + `_raw_data${i}.xlsx`;

        // const filename = 'abc.pdf'; // Test: can also download pdf.
        const filePathtxt = path.join(
            process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
            "files",
            filenametxt
        );
        if (fs.existsSync(filePathtxt)) {
            //
            const url = `https://data3.site/media/files/${filenametxt}`;
            textFilePaths.push(url);
        }
        // const filename = 'abc.pdf'; // Test: can also download pdf.
        const filePathxlsx = path.join(
            process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
            "files",
            filenamexlsx
        );
        if (fs.existsSync(filePathxlsx)) {
            //
            const url = `https://data3.site/media/files/${filenamexlsx}`;
            excelFilePaths.push(url);
        }
    }
    let dynamicTail = "";
    if (textFilePaths.length > 0 || excelFilePaths.length > 0) {
        dynamicTail += "\n数据下载:";

        if (textFilePaths.length > 0) {
            dynamicTail += "\r\n(1). 文本数据（可粘贴至AI分析）:";
            dynamicTail += `\r\n${textFilePaths.join("\r\n")}\r\n`;
        }

        if (excelFilePaths.length > 0) {
            dynamicTail += "\r\n(2). Excel数据（格式美观）:\r\n";
            dynamicTail += `\r\n${excelFilePaths.join("\r\n")}\r\n`;
        }

        dynamicTail += "\r\n（数据三天后过期）";
    }
    if (textFilePaths.length > 0 || excelFilePaths.length > 0) {
        return dynamicTail;
    }
    return "获取数据源失败，请稍后再尝试";
}

export { IntentionHandler, TaskHelper };
