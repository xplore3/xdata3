import { generateText, ModelClass } from "@data3os/agentcontext";

import { data3Fetch } from "data3-scraper";

import axios from "axios";

// const registrations = new Map<string, any>();

// export const getprotocols = async (specifier: string) => {
//     const module = registrations.get(specifier);
//     if (module !== undefined) {
//         return module;
//     } else {
//         return await import(specifier);
//     }
// };

// export const registerprotocols = (specifier: string, module: any) => {
//     registrations.set(specifier, module);
// };

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
 * 1. Prioritize reasoning accuracy:
 * choose o1-preview (complex tasks) or o1-mini (fast requirements).
 * 2. Multimodality and real-time:
 * choose GPT-4o, suitable for scenarios such as creativity and customer service.
 * 3. Daily low-cost needs:
 * choose GPT-4o-mini, which takes into account both speed and budget
 */

/**
 * This is a preprocessing method.
 * If there is no need to query data, then return the original question text.
 * If you need to query data, return the result of querying the data text and the original question text, and concatenate the prompt
 * words before returning.
 * This part of the logic not require processing of context memory.
 */
export const handleProtocols = async (runtime: any, originText: any) => {
    // This a example of how to use the Scraper module.
    // const res0 = await data3Fetch("https://example.com/");
    // console.log("handleProtocols res0: ", res0);
    // 1 token is about 4 chars.
    const charLengthLimit = 128000 * 3;
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
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification.
        The JSON format is: {"need_network": "true"}\n`;
    console.log("handleprotocols promt1: ", promt1);
    const response1 = await generateText({
        runtime,
        context: shortenStr(promt1),
        modelClass: ModelClass.LARGE,
    });
    console.log("handleProtocols response1: ", response1);
    const response1Str = response1.replace(/```json/g, "").replace(/```/g, "");

    let obj = JSON.parse(response1Str);

let promptPartOne = `
You are a data AI Agent that answers some user questions by querying network data multiple times.
[User Original question: ${originText}]
To make it easier for you to perform long logical inferences, I have mapped out the inference areas in your context.
This is a dynamic reasoning graph that includes the original question, each network request, and the new data collected at each step, as well as future plans, summaries, and reflections.
You Context is divided into three areas, and each area has some blocks.
[The first area] is the thinking template I provide for you.
[The second area] is your output according first area. With each loop, Before you thinking, I allow you to access network data until have enough data to ultimately answer the user's question.
[The third area] is the statement that you and I interact with at the current step and current state.

[Area1] :
[Block 1: Plan Block: 1.xxx. 2.xxx. (Clarify the core points of the question (e.g., the definition and scope of xxx).)]
[Block 2: Steps Logs Block: 1.xxx. 2.xxx. (You can record the simple situation and feedback in each step here. The feedback may be positive or negative to help you formulate the next step plan.)]
[Block 3: Data Collected Block: data1, data2, ... (This is a step-by-step result. Your each network request is processed, refined, and collected here. As you collect more and more data, when you have enough data, you can answer the user's question.)]
[Block 4: Next step plan Block: xxx (Adjust your plan continuously based on the data you collect.)]
[Block 5: Temporary Block: (1) data1, The temporary results of network requests are organized and refined, and then merged into Part 3. (2) data2, The current output needs to be saved in the current block for the next step of input.
For example, the return value next_cursor is used as the cursor parameter to complete the page query when turning pages.]
\n`;
let promptPartTwo = `[Area2]:
[Block 1: ...]
[Block 2: ...]
[Block 3: ]
[Block 4: ]
[Block 5: ]`;

let promptPartThree = `
\n[Area3]:
`; // [The third area] 



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

        if (!obj?.need_network.includes("true")) {
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
        {"baseurl": "url_1", "method": "{post or get}", "params": "object_1", "headers": "object_1", "body": "object_1"}, 
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.There is another situation where there is a dependency relationship, and this time you only need to return the interface of the current data. I will add the return result of this data query and origin question text in the next loop. Based on the new return result, you can continue to select the API for network calls and complete the dependency calls.
        At the same time, you also need to retrieve the parameters that may be used in [Area2][Block 5], such as the next_cursor in the previous return value, and pass it in as the cursor parameter for page turning query.
        Only one http request interface is returned at a time, and subsequent data can be requested in subsequent loops.
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;

        chatContextAccmulatingStr = promptPartOne + promptPartTwo + promptPartThree;
        if(chatContextAccmulatingStr.length > charLengthLimit) {
            console.log(`handleProtocols step: ${step} promt2 is too much, break.`);
            return chatContextAccmulatingStr;
        }
        const response2 = await generateText({
            runtime,
            context: shortenStr(chatContextAccmulatingStr),
            modelClass: ModelClass.LARGE,
        });
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
        try {
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
            promptPartThree = `\n[Area3]\nThe user origin quesiton[Question: ${originText}], The current API [API: ${JSON.stringify(
                Obj
            )}] The response str is too long, Based on the user's question, please remove irrelevant text, remove duplicate text and compress responce. For example, if the user's question is not related to the timestamp, the timestamp field can be removed. 
            Some fields are not related to the question and cannot be removed, such as next_cursor used for paging query, which needs to be used as the value of cursor as a parameter in the next query to complete the paging query.
            [Responce: ${JSON.stringify(
                apires.data
            )}].\n`;
            // The response str is too long, Use AI to remove irrelevant text and compress it.
            // const promtShorten = apiNeedShortenStr;
            const shortenapires = await generateText({
                // Compress redundant and irrelevant text
                runtime,
                context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
                modelClass: ModelClass.LARGE,
            });
            currentApiStr = `The current API [API: ${JSON.stringify(
                Obj
            )}] The responce [Responce: ${shortenapires}].\n`;
            // console.log("handleProtocols promtShorten: ", promtShorten);
            // console.log("handleProtocols currentApiStr: ", currentApiStr);
            //}
        } catch (e) {
            console.log("handleProtocols error: ", e);
            // chatContextAccmulatingStr += errorStr;
            currentApiStr = `The current API [API: ${JSON.stringify(
                Obj
            )}] request failed, The responce [Responce: ${e.toString().slice(100)}].\n`;
            continue;
        }
        // currentAPIResStr += currentApiStr;

        console.log(
            "handleProtocols http res: ",
            JSON.stringify(apires?.data)?.slice(0, 1000)
        );
        // }
        promptPartTwo += `[Block 5: ${currentApiStr}]\n`;
        promptPartThree = `\n[Area3]\nPlease summarize the AI PART 5 to AI PART 3, and then Return Second Area(AI Area)`;


        promptPartTwo = await generateText({
            runtime,
            context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
            modelClass: ModelClass.LARGE,
        });

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
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.\n
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification, The JSON format is: {"need_network": "true"}\n`;
        const response3 = await generateText({
            runtime,
            context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
            modelClass: ModelClass.LARGE,
        });
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
    const responseFinal = await generateText({
        runtime,
        context: shortenStr(promptPartOne + promptPartTwo + promptPartThree),
        modelClass: ModelClass.LARGE,
    });
    return responseFinal;
};
