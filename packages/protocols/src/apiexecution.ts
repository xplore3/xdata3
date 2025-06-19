// API Execution.ts
import axios from "axios";
import jsonata from "jsonata";
import { JSONPath } from "jsonpath-plus";

import {
  Memory,
  ModelClass,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import { IntentionHandler } from "./intention";
import APIWrapperFactory from "./apiwrapper";
import { ApiDb } from "./apis";
import { extractJson } from "./utils"


export class ApiExecution {

  constructor() {}

  static async executeApiAndGetResult(runtime: IAgentRuntime, message: Memory, api: JSON | any, totalCount: number): Promise<any> {
    const result = await this.executeApi(runtime, message, api, totalCount);
    const taskId = message.content?.intention?.taskId;
    return this.cacheResultData(result, taskId);
  }

  static async executeApiChainLoop(runtime: IAgentRuntime, message: Memory, api: JSON | any, totalCount: number): Promise<any> {
    if (api && api.execute_depend && api.execute_depend === 'chain_loop') {
      const api1 = ApiDb.getApi(api.request1);
      const api2 = ApiDb.getApi(api.request2);
      api1.query_params = api.query_params;
      const userInput = `${message.content.text}`;
      const result = await this.executeApi(runtime, message, api1, totalCount);
      const result2 = [];
      for (const item of result) {
        const prompt = `
          你是一个Nodejs程序员，能根据用户的请求，可用的API，API文档，生成调用API的URL的调用参数。
          用户的原需求为：${userInput}。
          调用参数的取值内容来源为：${JSON.stringify(item)}。
          可用的API参数说明为：${JSON.stringify(api2.query_params_desc)}。
          可用的API的文档地址为：${api2.docs_link}。
          根据这些输入，需要给出如下结果：
          {
            "query_params": "json of params",
            "request_count": 1
          }.
          关于query_params字段，需满足用户所有需求，且输出参数说明中的项，不能有参数说明之外的项；不是数组，仅仅是一个JSON对象。
          如果query_params的keyword之类的取值不能明显地从用户输入里获取，则需要结合自己的knowledge和背景。
          query_params字段示例如下：【${JSON.stringify(api2.query_params_example)}】。
          输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
          这里的request_count一般情况下都是1。
          -----------------------------
        `;
        try {
          let response = await generateText({
            runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
          });
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.query_params) {
              api2.query_params = execJson.query_params;
              const api2Result = await this.executeApi(
                runtime, message, api2, execJson.request_count
              );
              if (api2Result) {
                result2.push(api2Result);
              }
            }
          }
        }
        catch (err) {
          console.log(err);
        }
      }
      const taskId = message.content?.intention?.taskId;
      const { firstUnExistsTxtFilename: txt1, firstUnExistsExcelFilename: excel1 }
        = APIWrapperFactory.excelDataPersist(result, taskId + api1.name);
      const { firstUnExistsTxtFilename: txt2, firstUnExistsExcelFilename: excel2 }
        = APIWrapperFactory.excelDataPersist(result2, taskId + api2.name);
      return { JSON.stringify(result) + JSON.stringify(result2),
          [txt1 as string, txt2],
          [excel1 as string, excel2] };
      //return this.cacheResultData(result2, taskId);
      //return cacheText + this.cacheResultData(result2, taskId);
      // TODO
    }
    else {
      return await this.executeApiAndGetResult(runtime, message, api, totalCount);
    }
  }

  static async executeApi(runtime: IAgentRuntime, message: Memory, api: JSON | any, totalCount: number): Promise<any> {
    let result = [];
    try {
      /*if (api.method == 'POST') {
        const response = await axios.post(
          api.url as string,
          api.query_params,
          api.headers
        );
        console.log(response);
      }
      else if (api.method == 'GET') {
        const response = await axios.get(
          api.url as string,
          api.query_params,
          api.headers
        );
        console.log(response);
      }*/
      const options = {
        method: api.method,
        url: api.url,
        params: api.query_params,
        headers: api.headers
      }
      let response = null;
      try {
        const MAX_PAGES = 100;
        const MAX_TRY_COUNT = 100;
        let execCount = 0;
        let extractPath: string = null;
        let filterPath: string = null;
        for (let page = 1; page <= MAX_PAGES && result.length < totalCount; page++) {
          if (execCount++ > MAX_TRY_COUNT) { break; }

          try {
            // TODO: WORKAROUND of page
            if (options.params.page) {
              options.params.page = page;
            }
            console.log(options);
            response = await axios.request(options);
            console.log(response.data);
          }
          catch (err) {
            console.log(`axios.request error ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, 1000 + 1000 * execCount));
            continue;
          }
          // TODO: The response check should be compatible
          if (response.status != 200 || response?.data?.code != 0) {
            console.log(response);
            await new Promise((resolve) => setTimeout(resolve, 1000 + 1000 * execCount));
            continue;
          }
          let tempResult = [];
          // TODO: The response items should be compatible
          let items = response.data?.data?.items
              || response.data?.data?.comments
              || response.data?.data?.users
              || response.data?.data?.notes
              || response.data?.data?.list
              || [];
          if (api.filter) {
            try {
              if (extractPath === null || filterPath === null) {
                if (items && items.length > 0) {
                  filterPath = await IntentionHandler.genAIFilterPath(runtime, message, items[0]);
                  extractPath = await IntentionHandler.genAIExtraPath(runtime, message, items[0]);
                }
              }
              tempResult = JSONPath({
                path: filterPath,
                json: items,
              }) || [];
              console.log(tempResult.length);
              //tempResult = tempResult.map(item => {
              //    return eval(extractPath);
              //});
              //const extractFunc = new Function(
              //    "item",
              //    "return " + extractPath
              //);
              //tempResult = tempResult.map((item) =>
              //    extractFunc(item)
              //);
              const expression = jsonata(extractPath);
              tempResult = await expression.evaluate(tempResult) || [];
            }
            catch (err) {
              console.log(err);
            }
          }
          else {
            tempResult = [response.data?.data];
          }
          console.log(`${JSON.stringify(tempResult)}
            \n------------------------jsonata---------------------\n`);
          result = result.concat(tempResult);
          console.log(`executeApi result: ${result.length}`);
          
          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );
        }
        result?.slice(0, totalCount);
        console.log(`executeApi result : ${result?.length}`);
      }
      catch (err) {
        console.log(err);
      }
    }
    catch (err) {
      console.log(`executeApi ${api}`);
      console.error(err);
    }
    return result;
  }

  public static cacheResultData(result: string[], taskId: string) {
    try {
      let csvfileurl = "";
      let txtfilename;
      let excelfilename;
      if (result?.length > 0) {
        const { firstUnExistsTxtFilename, firstUnExistsExcelFilename } =
            APIWrapperFactory.excelDataPersist(result, taskId);
        txtfilename = firstUnExistsTxtFilename;
        excelfilename = firstUnExistsExcelFilename;
      }
      console.log(`cacheResultData result len: ${result.length}`);
      console.log(`cacheResultData csvfileurl: ${csvfileurl}`);
      return { result, txtfilename, excelfilename };
    }
    catch (err) {
      console.log(err);
    }
  }
}
