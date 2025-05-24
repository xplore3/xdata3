import { generateText, ModelClass } from "@data3os/agentcontext";
import { generateTextWithFile } from './aichatwithfiles';
import fs from 'fs';
import path from 'path';
import { data3Fetch } from "data3-scraper";

import axios from "axios";
import { appendToChatCache } from "./filehelper";
import APIWrapperFactory from "./apiwrapper";

// 1 token is about 4 chars.
const charLengthLimit = 128000 * 3;

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
}

/**
 * This is a preprocessing method.
 * If there is no need to query data, then return the original question text.
 * If you need to query data, return the result of querying the data text and the original question text, and concatenate the prompt
 * words before returning.
 * This part of the logic not require processing of context memory.
 */
export const handleProtocolsForPrompt = async (runtime: any, originText: any, taskId: any) => {
    const promt1 = `You are an interactive AI agent that can have multiple interactions when solving problems.
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
        return "system error 1001";
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
        console.error("JSON parse error:", e, "\nResponse content:", response1Str);
        obj = { 
            need_more: false,
            error: "Invalid JSON format"
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
export const handleProtocolsProcessing = async (runtime: any, originText: any, taskId: any) => {
    // Try quick Responce first.
    // let responce = await handleProtocolsForQuickResponce(runtime, originText, taskId);
    // console.log("yykai handleProtocolsForQuickResponce responce: ", responce);
    // if(!responce) {
    //     responce = await handleProtocolsByLongLogic(runtime, originText, taskId);
    // }
    const responce = await handleProtocolsByLongLogic(runtime, originText, taskId);
    return responce;
}

export const handleProtocolsForQuickResponce = async (
    runtime: any,
    originText: any,
    taskId: any
) => {
    let responseFinal = null;
    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    function shortenStr(str) {
        if (str.length > charLengthLimit) {
            return str.slice(0, charLengthLimit);
        }
        return str;
    }
    let promptPartThree = `You are a Data AI agent, [User Question: ${originText}].
    As long as the user's question contains keywords 'report' or '报告', you return a json structure: {"quickMode":"false"}.
        Otherwise, continue reading.
        You need to call once HTTP API request to answer user questions.
        Please analyze the description of the API below. ${JSON.stringify(
            apiXDataSourceArray
        )} , 
        Extracting the parameters of the problem from the user's question, ${originText}, 
        Retrieve from the API description in other parameters. 
        If you decide to use a quick responce mode, please return a JSON object containing the following fields:
        {"quickMode": true,"route": "notes_search","params": {"key1": "v1","key2": "v2"}}
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.
        `;
    let response2 = "";
    console.log("handleProtocols promptPartThree: ", promptPartThree);
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
    let Obj = null;
    try {
        Obj = JSON.parse(response2Str);
    } catch (e) {
        console.log("handleProtocols response2Str parse error: ", e);
    }
    if(!Obj?.route) {
        return null; 
    }

    let apires = null;
    let currentApiStr = "";
    let apiSuccess = false;
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
        console.log("1 handleProtocols Obj: ", Obj);
        apires = await APIWrapperFactory.executeRequest(Obj);
        console.log("2 handleProtocols Obj: ", JSON.stringify(apires).slice(0, 200));
        /********* data3 protocol v2 end *********/
    } catch (e) {
        console.log("handleProtocols error: ", e);
        // chatContextAccmulatingStr += errorStr;
        currentApiStr = `The current API [API: ${JSON.stringify(
            Obj
        )}] request failed, The responce [Responce: ${e
            .toString()
            .slice(200)}].\n`;
        apiSuccess = false;
    }
    // This is what you want to add
    const content = `\n The user's question, the API used, and the result of the API request are as follows.
    You need to answer the user's question based on the result of the API request.
            [Question: ${originText}]
            [API: ${JSON.stringify(Obj)}]
            [Responce: ${JSON.stringify(apires)}].
            \n`;
    try {
      responseFinal = await generateText({
        runtime,
        context: shortenStr(content),
        modelClass: ModelClass.SMALL,
    });
       console.log("quick responce: \n" + responseFinal)
    }
    catch (error) {
        console.error("handleProtocols error: ", error);
        return null;
    }
    return responseFinal;
};

export const handleProtocolsByLongLogic = async (runtime: any, originText: any, taskId: any) => {
    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    function shortenStr(str) {
        if (str.length > charLengthLimit) {
            return str.slice(0, charLengthLimit);
        }
        return str;
    }
    const promt1 = `Do the following questions need to be queried online?\n
        [Question: ${originText}] \n At the same time, you can read this list of HTTP APIs [APIs: ${JSON.stringify(
        apiXDataSourceArray
    )}.\n
        Please return a Boolean(need_network) value, true or false, to indicate whether this issue needs to be queried online.
        Is there a suitable API in the API list to answer the user's question?
        Please return a Boolean(api_available) value, true or false, to indicate whether there is a suitable API for user's question.
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification.
        The JSON format is: {"need_network": "true", "api_available":"false"}\n`;
    console.log("handleprotocols promt1: ", promt1);
    let response1 = "";
    try {
        // load memory load and data.
        // chat with the data txt file.
        const filePath = "chat-cache-file_" + taskId + ".txt";
        const fileExists = fs.existsSync(filePath);
        console.log(`online query Chat cache file ${filePath} exists: ${fileExists}`);
        if(!fileExists) {
            response1 = await generateText({
             runtime,
             context: shortenStr(promt1),
             modelClass: ModelClass.MEDIUM,
            });   
        } else {
            response1 = await generateTextWithFile(filePath, shortenStr(promt1));
        }
        // response1 = await generateText({
        //     runtime,
        //     context: shortenStr(promt1),
        //     modelClass: ModelClass.LARGE,
        // });
    } catch (error) {
        console.error("handleProtocols error: ", error);
        return "system error 1001";
    }

    console.log("handleProtocols response1: ", response1);
    const response1Str = response1.replace(/```json/g, "").replace(/```/g, "");

    let obj = JSON.parse(response1Str);

let promptPartOne = `
You are a data AI Agent that answers some user questions by querying network data multiple times.
[User Original question: ${originText}]
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
[Block 3: Data Collected Block: data1, data2, ... (This is a step-by-step result. Your each network request is processed, refined, and collected here. As you collect more and more data, when you have enough data, you can answer the user's question.)]
[Block 4: Next step plan Block: xxx (Adjust your plan continuously based on the data you collect.)]
[Block 5: Temporary Block: (1) data1, The temporary results of network requests are organized and refined, and then merged into Part 3. (2) data2, The current output needs to be saved in the current block for the next step of input.
For example, the return value next_cursor is used as the cursor parameter to complete the page query when turning pages.]
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
    
    do {
        ++step;
        if(step > 30) {
            console.log(`handleProtocols step: ${step} is too much, break.`);
            break;
        }
        console.log(`handleProtocols step: ${step} begin -------------------------------------`);
        let chatContextAccmulatingStr = promptPartOne + promptPartTwo + promptPartThree;

        if(chatContextAccmulatingStr.length > charLengthLimit) {
            console.log(`handleProtocols step: ${step} chatContextAccmulatingStr is too much, break.`);
            console.log(`handleProtocols step: ${step} end   -------------------------------------`);
            break; // context length limit 128k for GPT-4.
        }

        if (!obj?.need_network.includes("true") || !obj?.api_available.includes("true")) {
            // STEP: No need to query network data.
            console.log(`handleProtocols step: ${step} end   -------------------------------------`);
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
        {"route": "notes_search","params": {"key1": "v1","key2": "v2"}}
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.There is another situation where there is a dependency relationship, and this time you only need to return the interface of the current data. I will add the return result of this data query and origin question text in the next loop. Based on the new return result, you can continue to select the API for network calls and complete the dependency calls.
        At the same time, you also need to retrieve the parameters that may be used in [Area2][Block 5].
        Only one http request interface is returned at a time, and subsequent data can be requested in subsequent loops.
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;

        chatContextAccmulatingStr = promptPartOne + promptPartTwo + promptPartThree;
        if(chatContextAccmulatingStr.length > charLengthLimit) {
            console.log(`handleProtocols step: ${step} promt2 is too much, break.`);
            return chatContextAccmulatingStr;
        }
        let response2 = "";
        try {
        response2 = await generateText({
            runtime,
            context: shortenStr(chatContextAccmulatingStr),
            modelClass: ModelClass.MEDIUM,
        });
        } catch (error) {
            console.error("handleProtocols error: ", error);
            return "system error 1001";
        }

        console.log("handleProtocols response2: ", response2);
        const response2Str = response2.replace(/```json/g, "").replace(/```/g, "");
        let Obj = null;
        try {
            Obj = JSON.parse(response2Str);
        } catch (e) {
            console.log("handleProtocols response2Str parse error: ", e);
            continue;
        }

        let apires = null;
        let currentApiStr = "";
        let apiSuccess = false;
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
            console.log("3 handleProtocols Obj: ", Obj);
            apires = await APIWrapperFactory.executeRequest(Obj);
            console.log("4 handleProtocols Obj: ", JSON.stringify(apires).slice(0, 200));
            // This is what you want to add
            const content = `\n
            [Question: ${originText}]
            [API: ${JSON.stringify(Obj)}]
            [Responce: ${JSON.stringify(apires)}].
            \n`;
            
            const filename = "chat-cache-file_" + taskId + ".txt";
            appendToChatCache(content, filename, (err) => {
                console.error("Custom error handling:", err);
            });

            promptPartThree = `\n[Area3]\nThe user origin quesiton[Question: ${originText}], The current API [API: ${JSON.stringify(
                Obj
            )}] The response str is too long, Based on the user's question, please remove irrelevant text, remove duplicate text and compress responce. For example, if the user's question is not related to the timestamp, the timestamp field can be removed. 
            Some fields are not related to the question and cannot be removed, such as next_cursor used for paging query, which needs to be used as the value of cursor as a parameter in the next query to complete the paging query.
            [Responce: ${JSON.stringify(apires)}].\n`;
            // The response str is too long, Use AI to remove irrelevant text and compress it.
            // const promtShorten = apiNeedShortenStr;
            let shortenapires = "";
            try {
                shortenapires = await generateText({
                    // Compress redundant and irrelevant text
                    runtime,
                    context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
                    modelClass: ModelClass.LARGE,
                });
            } catch (e) {
                console.log("handleProtocols error: ", e);
                return "system error 1001";
            }

            currentApiStr = `The current API [API: ${JSON.stringify(
                Obj
            )}] The responce [Responce: ${shortenapires}].\n`;
            // console.log("handleProtocols promtShorten: ", promtShorten);
            // console.log("handleProtocols currentApiStr: ", currentApiStr);
            //}
            apiSuccess = true;
        } catch (e) {
            console.log("handleProtocols error: ", e);
            // chatContextAccmulatingStr += errorStr;
            currentApiStr = `The current API [API: ${JSON.stringify(
                Obj
            )}] request failed, The responce [Responce: ${e.toString().slice(200)}].\n`;
            apiSuccess = false;
        }
        // currentAPIResStr += currentApiStr;

        console.log(
            "handleProtocols http res: ",
            JSON.stringify(apires)?.slice(0, 1000)
        );
        // }
        promptPartTwo += `[Block 5: ${currentApiStr}]\n`;
        promptPartThree = `\n[Area3]\nPlease summarize the AI Block 5 to AI Block 3, and then Return Second Area(AI Area). Copy the user's question to the history question Area2-Block 0.`;

        try {
            promptPartTwo = await generateText({
                runtime,
                context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
                modelClass: ModelClass.LARGE,
            });
            // save memory
            await runtime.cacheManager.set(taskId + "_memory_by_step", `current_step: ${step}\n` + promptPartOne);
        } catch (e) {
            console.log("handleProtocols error: ", e);
            return "system error 1001";
        }
        // if(!apiSuccess) {
        //     console.log(`handleProtocols step: ${step} api failed, break.`);
        //     console.log(`handleProtocols step: ${step} end   -------------------------------------`);
        //     continue;
        // }

        console.log(
            `handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`
        );

        // Check if the goal is completed
        promptPartThree = `\n[Area3]\n
        Please check if the data above is sufficient to answer the user's question?\n
        You can read this list of HTTP APIs [APIs: ${JSON.stringify(
            apiXDataSourceArray
        )}.\n
        If the collected data is not enough, you need to continue searching online.You need to continue collecting data until the problem is finally solved. For example, if a user needs to find 100 KOLs, but you only find 10, this is not enough.
        There is another situation where you should end the API request. This is when there is insufficient data but there is no suitable API to obtain new data. No new data can be requested by requesting the API again. At this time, it is time to end the request.
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.\n
        Is there a suitable API in the API list to answer the user's question?
        Please return a Boolean(api_available) value, true or false, to indicate whether there is a suitable API for user's question(An API that has too many errors will not be allowed to be used again).
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification, The JSON format is: {"need_network": "true", "api_available":"false"}\n`;
        let response3 = "";
        try {
            const filePath = "chat-cache-file_" + taskId + ".txt";
            const fileExists = fs.existsSync(filePath);
            console.log(
                `online query Chat cache file ${filePath} exists: ${fileExists}`
            );
            if (!fileExists) {
                response3 = await generateText({
                    runtime,
                    context: shortenStr(
                        promptPartOne + promptPartTwo + promptPartThree
                    ),
                    modelClass: ModelClass.MEDIUM,
                });
            } else {
                response3 = await generateTextWithFile(
                    filePath,
                    shortenStr(promptPartOne + promptPartTwo + promptPartThree)
                );
            }
        } catch (e) {
            console.log("handleProtocols error: ", e);
            return "system error 1001";
        }

        console.log(`handleProtocols response3: ${response3}`);
        const response3Str = response3.replace(/```json/g, "").replace(/```/g, "");
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
        console.log(`handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`);

        console.log(`handleProtocols step: ${step} end   -------------------------------------`);


    } while (obj);
    promptPartThree = `\n[Area3]\nBased on the above results, answer user questions briefly and directly. The data here may not be sufficient, but first answer the user's question. For example, if the user asked to find 100 KOLs, but now there are only 10, answer the user's question first.`;
    let responseFinal = "";
    try {     
        // chat with the data txt file.
        const filePath = "chat-cache-file_" + taskId + ".txt";
        const fileExists = fs.existsSync(filePath);
        console.log(`Chat cache file ${filePath} exists: ${fileExists}`);
        if(!fileExists) {
            responseFinal = await generateText({
             runtime,
             context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
             modelClass: ModelClass.LARGE,
            });   
        } else {
            responseFinal = await generateTextWithFile(filePath, shortenStr(promptPartOne + promptPartTwo + promptPartThree));
        }
        const content = `AI Agent Memory:\n ${promptPartTwo}`;
        const filename = "chat-cache-file_" + taskId + ".txt";
        appendToChatCache(content, filename, (err) => {
            console.error("Custom error handling:", err);
        });
        console.log("handleProtocols appendToChatCache.");
    } catch (e) {
        console.log("handleProtocols error: ", e);
        return "system error 1003";
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