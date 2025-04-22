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
export const handleProtocols = async (runtime: any, text) => {
    // This a example of how to use the Scraper module.
    // const res0 = await data3Fetch("https://example.com/");
    // console.log("handleProtocols res0: ", res0);

    let resStr = "";
    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    const promt1 = `Do the following questions need to be queried online?\n
        [Question: ${text}] \n At the same time, you can read this list of HTTP APIs [APIs: ${JSON.stringify(
        apiXDataSourceArray
    )}.\n
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification.
        The JSON format is: {"need_network": "true"}\n`;
    console.log("handleprotocols promt1: ", promt1);
    const response1 = await generateText({
        runtime,
        context: promt1,
        modelClass: ModelClass.SMALL,
    });
    console.log("handleProtocols response1: ", response1);

    // data3Logger.log("oldXData: " , oldXDataSourceArray);
    // let apiDescription = "";
    let obj = JSON.parse(response1);
    let chatContextAccmulatingStr = "";
    chatContextAccmulatingStr += `You are a data analysis engineer, The user question is: ${text}\n`;
    let step = 0;

    do {
        ++step;
        if(step > 5) {
            break;
        }
        // 1 token ≈ 4 char.
        const charLengthLimit = 128000 * 4;
        if(chatContextAccmulatingStr.length > charLengthLimit) {
            chatContextAccmulatingStr = chatContextAccmulatingStr.slice(charLengthLimit);
            break; // context length limit 128k for GPT-4.
        }

        chatContextAccmulatingStr += `Current step: ${step}.\n`;
        if (!obj?.need_network.includes("true")) {
            break;
        }
        const promt2 = `You are a data analysis engineer, and you need to call multiple data request interfaces to answer user questions. The following answer should be as tight and brief as possible.
        Please analyze the description of the interface below. ${JSON.stringify(
            apiXDataSourceArray
        )} , 
        Extracting the parameters of the problem from the user's question,${text}, 
        Retrieve from the interface description in other parameters. 
        Please return a JSON object containing the following fields:
        [{"baseurl": "url_1", "method": "{post or get}", "params": "object_1", "headers": "object_1", "body": "object_1"},
        [{"baseurl": "url_2", "method": "{post or get}", "params": "object_2", "headers": "object_2", "body": "object_2"}],
        Note that this is an array. For example, if you want to know information about multiple users, you need to query multiple times. In this case, you need to return an array.
        There is another situation where there is a dependency relationship, and this time you only need to return the interface of the current data.
        I will add the return result of this data query in the next loop. Based on the new return result, you can continue to select the API for network calls and complete the dependency calls.
        Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;
        console.log("handleProtocols promt2: ", promt2);
        const response2 = await generateText({
            runtime,
            context: promt2,
            modelClass: ModelClass.LARGE,
        });
        console.log("handleProtocols response2: ", response2);
        const ObjArray = JSON.parse(response2);
        let apiresArray = [];

        for (const Obj of ObjArray) {
            let apires = null;
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
            } catch (e) {
                console.log("handleProtocols error: ", e);
                const errorStr =
                    "Network request failed, please check if the network connection or API parameters are correct. e: " +
                    e.toString().slice(0, 1000);
                // return errorStr;
                apiresArray.push(errorStr);
            }
            chatContextAccmulatingStr += `Current API [${JSON.stringify(
                Obj
            )}] responce [${JSON.stringify(apires.data)}].\n`;
            console.log(
                "handleProtocols http res: ",
                JSON.stringify(apires.data).slice(0, 1000)
            );
            apiresArray.push(apires.data);
        }
        console.log(
            `handleProtocols chatContextAccmulatingStr: ${chatContextAccmulatingStr}`
        );
        const promt3 = `${chatContextAccmulatingStr}
        Please check if the data above is sufficient to answer the user's question?\n
        You can read this list of HTTP APIs [APIs: ${JSON.stringify(
            apiXDataSourceArray
        )}.\n
        Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online.\n
        Please use JSON to return the result, without including any other content or requiring markdown syntax modification, The JSON format is: {"need_network": "true"}\n`;
        console.log(`handleProtocols promt3: ${promt3}`);
        const response3 = await generateText({
            runtime,
            context: promt3,
            modelClass: ModelClass.LARGE,
        });
        console.log(`handleProtocols response3: ${response3}`);
        obj = JSON.parse(response3);
    } while (obj);
    return chatContextAccmulatingStr;
};
