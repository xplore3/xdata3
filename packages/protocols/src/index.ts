import {
    generateText,
ModelClass,
} from "@data3os/agentcontext";

import {
  data3Fetch,
  } from "data3-scraper";
  

import axios from "axios";

const registrations = new Map<string, any>();

export const getprotocols = async (specifier: string) => {
  const module = registrations.get(specifier);
  if (module !== undefined) {
    return module;
  } else {
    return await import(specifier);
  }
};

export const registerprotocols = (specifier: string, module: any) => {
    registrations.set(specifier, module);
};

export const getProtocolArray = async (runtime: any) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("protocol oldXData: ", oldXDataSourceArray);
    return oldXDataSourceArray ?? [];
};

export const updateProtocolArray = async (runtime: any, newXDataSourceArray) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("protocol oldXData: ", oldXDataSourceArray);

    if (newXDataSourceArray.length > 0) {
        await runtime.cacheManager.set("XData_Collection", newXDataSourceArray);
    }
};

  /**
   * This is a preprocessing method.
   * If there is no need to query data, then return the original question text.
   * If you need to query data, return the result of querying the data text and the original question text, and concatenate the prompt
   * words before returning.
   * This part of the logic odes not require processing of memory function.
   */
export const handleprotocols = async (runtime: any, text) => {
  const res0 = await data3Fetch("https://example.com/");
  console.log("yykai res0: ", res0);

  let resStr = "";
  let finalres2 = null;

    const apiXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    const promt1 =
        "Do the following questions need to be queried online:\n" +
        text +
        `\n At the same time, you can read this list of HTTP APIs ${JSON.stringify(
            apiXDataSourceArray
        )}.\n Please return a Boolean value, true or false, to indicate whether this issue needs to be queried online. If you need to query online, please traverse this HTTP API list. If there are suitable APIs to use, please return the API ID. If there are no suitable options, please return to -1. ID is numbered from 0.\n
Please use JSON to return the result, without including any other content or requiring markdown syntax modification. The JSON format is: {"need_network": "true","api_id": "1"}\n`;
    console.log("yykai promt1: ", promt1);
    const response1 = await generateText({
        runtime,
        context: promt1,
        modelClass: ModelClass.LARGE,
    });
    console.log("yykai response1: ", response1);

    // data3Logger.log("oldXData: " , oldXDataSourceArray);
    // let apiDescription = "";
    const obj = JSON.parse(response1);
    if (obj?.need_network.includes("false")) {
        return text;
    }
    if (obj?.need_network.includes("true") && obj?.api_id != -1) {
        const httpAPI = apiXDataSourceArray[obj?.api_id];
        console.log("httpAPI: ", httpAPI);
        const promt2 = `Please analyze the description of the interface below. ${JSON.stringify(
            httpAPI
        )} , Extracting the parameters of the problem from the user's question,${text}，Retrieve from the interface description in other parameters. Please return a JSON object containing the following fields: {"baseurl": "string", "method": "{post or get}", "params": "object", "headers": "object", "body": "object"}, Please return this JSON object directly without any explanation, comments, other content, or markdown syntax modification.`;
        console.log("yykai promt2: ", promt2);
        const response2 = await generateText({
            runtime,
            context: promt2,
            modelClass: ModelClass.LARGE,
        });
        console.log("yykai response: ", response2);
        const Obj = JSON.parse(response2);
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
            console.log("yykai error: ", e);
            apires =
                "Network request failed, please check if the network connection or API parameters are correct. e: " +
                e.toString().slice(0, 1000);
            resStr = apires;
            return resStr;
        }
        console.log("yykai res1: ", JSON.stringify(apires.data).slice(0, 1000));
        const promt3 = `This HTTP API ${JSON.stringify(httpAPI)} responce ${JSON.stringify(
            apires.data
        )} . Answer the user's question based on the return value ${text}, Please answer the user's question simply and directly without explanation. Simply answer the user's question.`;
        console.log("yykai promt3: ", promt3);
        // finalres2 = await generateText({
        //     runtime,
        //     context: promt3,
        //     modelClass: ModelClass.LARGE
        // });
        // console.log("yykai responce: ", finalres2);
        // //res.json({ res: finalres2 });
        // resStr = finalres2;
        // return resStr;
        return promt3;
    } else {
        return text;
    }
};