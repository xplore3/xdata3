// API Execution.ts
import axios from "axios";
import jsonata from "jsonata";
import { JSONPath } from "jsonpath-plus";
import { SocksProxyAgent } from 'socks-proxy-agent';

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
import { axios_request } from "./httpproxy";
import { UserKnowledge } from "./userknowledge";
import { DataCache } from "./cache";


const gProxyAgent = new SocksProxyAgent(`socks5://${process.env.GLOBAL_PROXY_AGENT}`);

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
          调用参数的取值内容来源为PARAM_SOURCE：${JSON.stringify(item)}。
          API能力说明：${api2.description}。
          可用的API参数说明为：${JSON.stringify(api2.query_params_desc)}。
          可用的API的文档地址为：${api2.docs_link}。
          根据这些输入，需要给出如下结果：
          {
            "query_params": {json of params},
            "request_count": count from PARAM_SOURCE, 不要超过100
          }.
          关于query_params字段，需满足用户需求，且查询参数不能有参数说明之外的项；不要额外加字段；不是数组，仅仅是一个JSON对象。
          query_params中的关键字的取值需要严格从指定来源${JSON.stringify(item)}中获取，不能有之外的值，不能生成值。
          query_params须是一个JSON对象，不能是字符串等。
          query_params中的搜索关键词不能太长，一般为用户的产品，不需要带品牌名称，一般是一个词语，不能超过2个词语。
          query_params字段示例如下：【${JSON.stringify(api2.query_params_example)}】。
          输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
          这里的request_count的值取决于PARAM_SOURCE中的说明，比如如果comments_count有10个，则对应的comment接口结果数量就是10个。
          -----------------------------
        `;
        try {
          let response = await generateText({
            runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
          });
          console.log(prompt);
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.query_params) {
              api2.query_params = execJson.query_params;
              const execCount = execJson.request_count <= 100 ? execJson.request_count : 100;
              await new Promise((resolve) => setTimeout(resolve, 100));
              const api2Result = await this.executeApi(
                runtime, message, api2, execCount
              );
              if (api2Result) {
                result2.push(...api2Result);
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
      return { result: `${JSON.stringify(result)}\n${JSON.stringify(result2)}`,
          txtfilename: [txt1, txt2],
          excelfilename: [excel1, excel2] };
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
    console.log(`executeApi ${totalCount}`);
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
        data: api.query_params,
        //body: JSON.stringify(api.query_params),
        headers: api.headers,
        httpAgent: gProxyAgent,
        httpsAgent: gProxyAgent
      }
      if (api.method === 'GET' || api.method === 'get') {
        options.params = api.query_params;
      }
      let response = null;
      try {
        const MAX_PAGES = 100;
        const MAX_TRY_COUNT = 100;
        const MAX_FAILED_COUNT = 10;
        let execCount = 0;
        let failedCount = 0;
        let extractPath: string = null;
        let filterPath: string = null;
        for (let page = 1; page <= MAX_PAGES && result.length < totalCount; page++) {
          if (execCount++ > MAX_TRY_COUNT) { break; }
          let items = [];
          let readCache = false;

          try {
            // TODO: WORKAROUND of page
            if (options.params?.page) {
              options.params.page = page;
            }
            console.log(options.url);
            console.log(options.params);
            response = await axios.request(options);
            //response = await axios_request(options);
            console.log(response.data);
          }
          catch (err) {
            console.log(`axios.request ${err.status} error ${err.message}`);
            if (failedCount++ > MAX_FAILED_COUNT) {
              break;
            }
            if ((err.status == 503 || err.status == 400) && api.backup && api.backup != "") {
              const apiBackup = ApiDb.getApi(api.backup);
              const newParams = await this.getApiBackupQueryParam(runtime, message, apiBackup);
              if (newParams) {
                apiBackup.query_params = newParams;
                const bkResult = await this.executeApi(runtime, message, apiBackup, totalCount);
                result.concat(bkResult);
                break;
              }
            }
            if (api.could_cached) {
              let cache = await DataCache.getApiCacheData(runtime, api.id);
              try {
                cache = await JSON.parse(cache);
                if (cache) {
                  items.push(...cache);
                  readCache = true;
                }
                else {
                  continue;
                }
              }
              catch (err) {
                continue;
              }
            }
            else {
              await new Promise((resolve) => setTimeout(resolve, 1000 + 1000 * execCount));
              continue;
            }
          }
          let tempResult = [];
          if (!readCache) {
            // TODO: The response check should be compatible
            if (response.status != 200) {
              console.log(response);
              if (failedCount++ > MAX_FAILED_COUNT) {
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 1000 + 1000 * execCount));
              continue;
            }
            // TODO: The response items should be compatible
            // TODP: Use of api.data_path
            if (api.data_path != '') {
              try {
                console.log(`JSONPath ${api.data_path}`);
                items = JSONPath({
                  path: api.data_path,
                  json: response
                });
                items = items[0];
                //console.log(`JSONPath ${items}`);
              }
              catch (err) {
                console.log(err);
                items = response;
              }
            }
            else {
              items = response.data?.data?.items
                || response.data?.data?.data?.items
                || response.data?.data?.comments
                || response.data?.data?.users
                || response.data?.data?.notes
                || response.data?.data?.list
                || response.data?.data
                || response.data
                || response
                || [];
            }
            if (api.could_cached) {
              await DataCache.setApiCacheData(runtime, api.id, JSON.stringify(items));
            }
          }
          if (items) {
            console.log(`Response items: ${items.length || items}`);
            // WORKAROUND
            if (api.id == 'hot_words' && items.length <= 3) {
              let cache = await DataCache.getApiCacheData(runtime, api.id);
              try {
                cache = await JSON.parse(cache);
                if (cache) {
                  items = [...cache];
                }
              }
              catch(err) {}
            }
          }
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
                sandbox: { parseInt }
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
              if (api.flattener != '') {
                const expression = jsonata(api.flattener);
                tempResult = await expression.evaluate(tempResult) || [];
              }
              else {
                const expression = jsonata(extractPath);
                tempResult = await expression.evaluate(tempResult) || [];
              }
            }
            catch (err) {
              console.log(err);
              //TODO: 重新生成filterPath/extractPath
            }
          }
          else {
            try {
              if (api.flattener != '') {
                const expression = jsonata(api.flattener);
                tempResult = await expression.evaluate(items) || [];
                tempResult = tempResult.map(item => {
                  if (item.sub_comments) {
                    item.sub_comments = JSON.stringify(item.sub_comments);
                  }
                  return item;
                })
              }
              else {
                tempResult = items;
              }
              /*if (Array.isArray(items)) {
                tempResult = items.map(item => {
                  const tempItem = IntentionHandler.flattenJSON(item);
                  console.log(tempItem);
                  return tempItem;
                })
              }
              else {
                tempResult = [IntentionHandler.flattenJSON(items)];
              }*/
            }
            catch (err) {
              console.log(err);
              tempResult = [JSON.stringify(items)];
              //TODO: 重新生成extractPath
            }
          }
          //console.log(`${JSON.stringify(tempResult)}
          //  \n------------------------jsonata---------------------\n`);
          result = result.concat(tempResult);
          console.log(`executeApi result: ${result.length}`);

          if (!(options.params?.page)) {
            break; // no loop for un-pages
          }
          
          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );
        }
        result = result?.slice(0, totalCount);
        console.log(`executeApi final length : ${result?.length}`);
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

  static async getApiBackupQueryParam(runtime: IAgentRuntime, message: Memory, api: JSON | any): Promise<any> {
    console.log(`getApiBackupQueryParam`);
    const userInput = `${message.content.text}`;
    const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
    const prompt = `
      你是一个Nodejs程序员，能根据用户的请求，可用的API，API文档，生成调用API的URL的调用参数。
      用户的原输入为：${userInput}。
      可用的API参数说明为：${JSON.stringify(api.query_params_desc)}。
      可用的API的文档地址为：${api.docs_link}。
      用户相关的产品、业务及背景为：${userProfile}。
      根据这些输入，需要给出如下结果：
        {
          "query_params": {json of params},
          "request_count": total count of user request from users input, 不要超过100
        }.
      关于query_params字段，需满足用户所有需求，且输出参数说明中的项，不能有参数说明之外的项；不是数组，仅仅是一个JSON对象。
      如果query_params的keyword之类的取值不能明显地从用户输入里获取，则需要结合自己的knowledge和背景。
      query_params中的搜索关键词不能太长，不能超过3个词语。
      query_params须是一个JSON对象，不能是字符串等。
      query_params字段示例如下：【${JSON.stringify(api.query_params_example)}】。
      输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      let execJson = extractJson(response);
      if (execJson) {
        if (execJson.query_params) {
          return execJson.query_params;
        }
      }
      return null;
    }
    catch (err) {
      console.log(`getApiBackupQueryParam ${api}`);
      console.error(err);
    }
    return null;
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
