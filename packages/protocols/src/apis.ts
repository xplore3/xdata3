// API Tabls.ts
import {
  ModelClass,
  UUID,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import axios from 'axios';


export class ApiDb {

  constructor() {}

  static getPlatformDesc(keys: string[]) {
    const platforms = {
      'rednote': '小红书/xiaohongshu/REDNote',
      'tiktok': '抖音/TikTok/douyin',
    }
    return keys.filter(key => key in platforms)
        .map(key => `${key}: ${platforms[key]}`);
  }

  static async getUserDataPlatform(userId: UUID) {
    const platforms = await ApiDb.getAllPlatforms();
    const platformDesc = ApiDb.getPlatformDesc(platforms);
    console.log(platformDesc)
    return platformDesc;
  }

  static async getUserDataSource(platform: string, userId: UUID) {
    /*const sources = [
      //'hot_words: 用以获得近期火热的热词/热搜词等',
      //'topic_rank: 用以获得近期流行的话题/Tag等',
      'koc_search: 根据账号关键字搜索红人/KOC/账号的基本画像，包括其基础信息、内容特征、粉丝画像、商业指标等',
      'koc_image: 根据ID获取账号的详细信息和画像，包括其账号概览、粉丝分析、笔记分析、投放分析、品牌推广、品类分析、直播分析等',
      //'industry_rank: 根据领域/频道/分类获取红人榜单，包括其基础信息、粉丝/点赞/收藏数量、指数等',
      'top_trend: 读取小红书等平台的热词/热搜词，以及热门话题/Tag；仅用以热词热搜热门话题Tag，如果用户要找内容/笔记/帖子等不适合此选项',
      'koc_imitate: 优秀账号对标，根据我的产品、业务和背景等搜索到合适的对标网红KOC，及其热门笔记；该操作能获得KOC列表和其内容列表两类数据',
      'koc_evaluate: 达人合作评估，根据给定的达人网红KOC账号信息，找到其详细画像，对其进行合作评估；该操作能获得KOC画像和其内容列表两类数据',
      'notes_search: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表；',
      //'note_detail: 通过noteid获取单个笔记/帖子/note的详情',
      //'users_search: 用以通过关键字搜索小红书账号，获得账号列表',
      //'get_user: 用以通过单个小红书账号ID获取该账号的详情',
      'note_comments_list: 用以通过单个笔记/帖子的ID获取其评论列表',
      'fetch_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据；如果用户没有明确要求取出评论，则不要选此选项。',
      'fetch_notes_and_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据；如果用户没有明确要求取出评论，则不要选此选项。',
      'get_note_list: 用以通过单个小红书账号ID获取该账号的笔记/帖子的列表'
    ];*/
    const sources = await ApiDb.getApiDescByPlatform(platform);
    //console.log(sources1);
    return sources;
  }

  static async getApi(api_key: string) {
    if (!api_key) {
      console.log('getApi', api_key);
      return null;
    }
    const api = await this.getApiFromDb(api_key);
    //console.log('api', api);
    if (api && api.execute_depend) {
      //const apiNext = await this.getApiFromDb(api.execute_sequence[0]);
      //return { ...apiNext, ...api };
    }
    return api;
  }

  static async getAllPlatforms() {
    try {
      const config = {
        url: `${process.env.API_DB_URL}/api/xdata3/platforms`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const response = await axios(config);
      //console.log(response.data);
      if (response.status != 200) {
        console.log(response);
        console.log("Error in response " + response.statusText);
        return null;
      }

      return response.data.data;
    } catch (err) {
      console.log(err);
    }
    return null;
  }

  static async getApiDescByPlatform(platform: string) {
    try {
      const config = {
        url: `${process.env.API_DB_URL}/api/xdata3/key-descriptions-by-platform?platform=${platform}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const response = await axios(config);
      //console.log(response.data);
      if (response.status != 200) {
        console.log(response);
        console.log("Error in response " + response.statusText);
        return null;
      }

      return response.data.data;
    } catch (err) {
      console.log(err);
    }
    return null;
  }

  static async getApiFromDb(api_key: string) {
    try {
      const config = {
        url: `${process.env.API_DB_URL}/api/xdata3/api-details-by-key?key=${api_key}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const response = await axios(config);
      //console.log(response.data);
      if (response.status != 200) {
        console.log(response);
        console.log("Error in response " + response.statusText);
        return null;
      }

      try {
        const json = JSON.parse(response.data.data);
        return json;
      } catch (err) {
        console.log(err.message);
      }
      return response.data.data
    } catch (err) {
      console.log(err);
    }
    return null
  }
}
