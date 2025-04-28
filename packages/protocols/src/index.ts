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
    let resStr = "";
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
        modelClass: ModelClass.SMALL,
    });
    console.log("handleProtocols response1: ", response1);
    const response1Str = response1.replace(/```json/g, "").replace(/```/g, "");

    let obj = JSON.parse(response1Str);
    let currentAPIResStr = "";
    let aipartStr = `AI part:
[Part 1: ...]
[Part 2: ...]
[Part 3: ]
[Part 4: ]
[Part 5: ]
[Part 6: ]
[Part 7: ]`;
 let   originQuestionPrompt = `
You are a data AI proxy. My following prompt is divided into two parts. The first part is the thinking template I provide for you. The second part is where I append your output as results to the end of the template. During this process, I allow you to access network data. With each loop, you continuously request network data, and ultimately answer the user's question.
Template part:
[Part 1 Role: You are a data AI proxy that answers some user questions by querying network data multiple times.]
[Part 2 Original question: ${originText}]
[Part 3 Plan: 1.xxx. 2.xxx. (Clarify the core points of the question (e.g., the definition and scope of xxx).)]
[Part 4: Steps: 1.xxx. 2.xxx. (You can record the simple situation and feedback in each step here. The feedback may be positive or negative to help you formulate the next step plan.)]
[Part 5: Collected results: xxxx (This is a step-by-step result. Your each network request is processed, refined, and collected here. As you collect more and more data, when you have enough data, you can answer the user's question.)]
[Part 6: Next step plan: xxx (Adjust your plan continuously based on the data you collect.)]
[Part 7: The temporary results of network requests are organized and refined, and then merged into Part 5.]
\n`;
let chatContextAccmulatingStr = originQuestionPrompt + aipartStr;


    let step = 0;

    do {
        ++step;
        if(step > 5) {
            console.log(`handleProtocols step: ${step} is too much, break.`);
            break;
        }
        console.log(`handleProtocols step: ${step} begin -------------------------------------`);

        if(chatContextAccmulatingStr.length > charLengthLimit) {
            chatContextAccmulatingStr = chatContextAccmulatingStr.slice(charLengthLimit);
            break; // context length limit 128k for GPT-4.
        }

        if (!obj?.need_network.includes("true")) {
            break;
        }
        // STEP: Data source selection
        const promt2 = chatContextAccmulatingStr + `. And you need to call multiple data request interfaces to answer user questions. The following answer should be as tight and brief as possible.
        Please analyze the description of the interface below. ${JSON.stringify(
            apiXDataSourceArray
        )} , 
        Extracting the parameters of the problem from the user's question, ${originText}, 
        Retrieve from the interface description in other parameters. 
        Please return a JSON object containing the following fields:
        {"baseurl": "url_1", "method": "{post or get}", "params": "object_1", "headers": "object_1", "body": "object_1"}, 
        When you use an API to search for multiple keywords, you can split them up, such as: Query(A), Query(B), Query(C). Instead of just Query(A B C), it is easy to get no results if you query many groups of keywords at the same time.There is another situation where there is a dependency relationship, and this time you only need to return the interface of the current data. I will add the return result of this data query and origin question text in the next loop. Based on the new return result, you can continue to select the API for network calls and complete the dependency calls.
        The complete calling process is similar to the following:
        [Question: user origin question text]
        [Step1]:
        HTTP query Url1,
        HTTP responce ans1,
        [Step2]:
        HTTP query Url2
        HTTP responce ans2
        [Step3]:
        HTTP query Url3
        HTTP responce ans3
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;
        console.log("handleProtocols promt2: ", promt2);
        if(promt2.length > charLengthLimit) {
            return chatContextAccmulatingStr;
        }
        const response2 = await generateText({
            runtime,
            context: shortenStr(promt2),
            modelClass: ModelClass.LARGE,
        });
        console.log("handleProtocols response2: ", response2);
        const response2Str = response2.replace(/```json/g, "").replace(/```/g, "");
        const Obj = JSON.parse(response2Str);

        // chatContextAccmulatingStr += `\n[Current step: ${step}]\n`;

        // for (const Obj of ObjArray) {
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
                currentApiStr = `The current API [API: ${JSON.stringify(Obj)}] The responce [Responce: ${JSON.stringify(apires.data)}].\n`;
                //if(currentApiStr.length > charLengthLimit / 10) {
                    let apiNeedShortenStr = `The user origin quesiton[Question: ${originText}], The current API [API: ${JSON.stringify(Obj)}] The response str is too long, Based on the user's question, please remove irrelevant text, remove duplicate text and compress responce.For example, if the user's question is not related to the timestamp, the timestamp field can be removed. [Responce: ${JSON.stringify(apires.data)}].\n`;
                    // The response str is too long, Use AI to remove irrelevant text and compress it.
                    const promtShorten = apiNeedShortenStr;
                    const shortenapires = await generateText({ // Compress redundant and irrelevant text
                        runtime,
                        context: shortenStr(promtShorten),
                        modelClass: ModelClass.LARGE,
                    });
                    currentApiStr = `The current API [API: ${JSON.stringify(Obj)}] The responce [Responce: ${shortenapires}].\n`;
                    // console.log("handleProtocols promtShorten: ", promtShorten);
                    // console.log("handleProtocols currentApiStr: ", currentApiStr);
                //}
            } catch (e) {
                console.log("handleProtocols error: ", e);
                const errorStr =
                    `Current API [${JSON.stringify(Obj)}]  request failed, please check if the network connection or API parameters are correct.`;
                // chatContextAccmulatingStr += errorStr;
                currentApiStr = `The current API [API: ${JSON.stringify(Obj)}] The responce [Responce: ${errorStr}].\n`;
            }
            currentAPIResStr += currentApiStr;

            console.log(
                "handleProtocols http res: ",
                JSON.stringify(apires?.data)?.slice(0, 1000)
            );
        // }
        chatContextAccmulatingStr += `[PART 7: ${currentAPIResStr}]\n`;


        chatContextAccmulatingStr = await generateText({
            runtime,
            context: shortenStr(chatContextAccmulatingStr + "\nPlease summarize the AI PART 7 to AI PART 5"),
            modelClass: ModelClass.LARGE,
        });

        console.log(
            `handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`
        );
        const promt3 = `${chatContextAccmulatingStr} // Check if the goal is completed
        Please check if the data above is sufficient to answer the user's question?\n
        You can read this list of HTTP APIs [APIs: ${JSON.stringify(
            apiXDataSourceArray
        )}.\n
        If the collected data is not enough, you need to continue searching online.You need to continue collecting data until the problem is finally solved. For example, if a user needs to find 100 KOLs, but you only find 10, this is not enough.
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.\n
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification, The JSON format is: {"need_network": "true"}\n`;
        console.log(`handleProtocols promt3: ${promt3}`);
        const response3 = await generateText({
            runtime,
            context: shortenStr(promt3),
            modelClass: ModelClass.LARGE,
        });
        console.log(`handleProtocols response3: ${response3}`);
        const response3Str = response3.replace(/```json/g, "").replace(/```/g, "");
        obj = JSON.parse(response3Str);
        // STEP: Reflection
        // chatContextAccmulatingStr = await generateText({
        //     runtime,
        //     context: shortenStr("Summarize and reflect on the following results: [User-Question: xxx][Plan: 1.xxx. 2.xxx. 3.xxx.][Step: 1.xxx. 2.xxx. 3.xxx.][Results has collected: xxxx]" + chatContextAccmulatingStr),
        //     modelClass: ModelClass.LARGE,
        // });
        console.log(`handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`);

        console.log(`handleProtocols step: ${step} end   -------------------------------------`);


    } while (obj);
    const responseFinal = await generateText({
        runtime,
        context: shortenStr(chatContextAccmulatingStr + "\nBased on the above results, please answer the user's question."),
        modelClass: ModelClass.LARGE,
    });
    return responseFinal;
};
