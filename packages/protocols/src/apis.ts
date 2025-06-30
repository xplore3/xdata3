// API Tabls.ts
import {
  ModelClass,
  UUID,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";


export class ApiDb {

  constructor() {}

  static getUserDataPlatform(userId: UUID) {
    const platforms = ["小红书", "RedNote"];
    return platforms;
  }

  static getUserDataSource(userId: UUID) {
    const sources = [
      //'hot_words: 用以获得近期火热的热词/热搜词等',
      //'topic_rank: 用以获得近期流行的话题/Tag等',
      'koc_search: 根据账号关键字搜索红人/KOC/账号的基本画像，包括其基础信息、内容特征、粉丝画像、商业指标等',
      'koc_image: 根据ID获取KOC的详细画像，包括其账号概览、粉丝分析、笔记分析、投放分析、品牌推广、品类分析、直播分析等',
      //'industry_rank: 根据领域/频道/分类获取红人榜单，包括其基础信息、粉丝/点赞/收藏数量、指数等',
      'top_trend: 读取小红书等平台的热词/热搜词，以及热门话题/Tag；仅用以热词热搜热门话题Tag，如果用户要找内容/笔记/帖子等不适合此选项',
      'koc_imitate: 优秀账号对标，根据我的产品、业务和背景等搜索到合适的对标网红KOC，及其热门笔记；该操作能获得KOC列表和其内容列表两类数据',
      'koc_evaluate: 达人合作评估，根据给定的达人网红KOC账号信息，找到其详细画像，对其进行合作评估；该操作能获得KOC画像和其内容列表两类数据',
      'notes_search: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表；',
      //'note_detail: 通过noteid获取单个笔记/帖子/note的详情',
      'users_search: 用以通过关键字搜索小红书账号，获得账号列表',
      'get_user: 用以通过单个小红书账号ID获取该账号的详情',
      'notes_comment_by_next_page: 用以通过单个笔记/帖子的ID获取其评论列表',
      'fetch_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据；如果用户没有明确要求取出评论，则不要选此选项。',
      'fetch_notes_and_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据；如果用户没有明确要求取出评论，则不要选此选项。',
      'get_note_list: 用以通过单个小红书账号ID获取该账号的笔记/帖子的列表'
    ];
    return sources;
  }

  static getApi(api_desc: string) {
    const apiList = {
      notes_search_1: {
        id: 'notes_search_1',
        backup: 'notes_search_2',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表',
        name: 'notes',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-note/v2',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          keyword: 'String, keyword for query',
          page: 'number, For multi pages, Default is 1',
          sort: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New), comment_descending: 最多评论(Comment Desc), collect_descending: 最多收藏(Collect Desc)；这里优先使用popularity_descending',
          noteType: 'Enum: Note type(default: _0), _0: 综合(General), _1: 视频筛选(Video), _2: 图文筛选(Normal), _3:直播筛选(Live)',
          noteTime: '(optional)String, 一天内: 一天内(within one day), 一周内: 一周内(within a week), 半年内: 半年内(Within half a year)；如果用户没有指定，则默认填写半年内'
        },
        query_params_example: {
          keyword: 'dance',
          page: 1,
          sort: 'popularity_descending',
          noteType: '_0',
          noteTime: '%E5%8D%8A%E5%B9%B4%E5%86%85'
        },
        docs_link: 'https://rapidapi.com/dataapiman/api/xiaohongshu-all-api/playground/apiendpoint_b2edca5d-0e93-4b66-8deb-9653fb71e9b5',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: true,
        data_path: `$.data.data.items`,
        flattener: `$map($, function($item) {
          {
            'id': $item.note.id,
            'author': $item.note.user.nickname,
            'title': $item.note.title,
            'display_title': $item.note.abstract_show,
            'desc': $item.note.desc,
            'date': [$item.note.timestamp, 0][0],
            'type': $item.note.type,
            'tags': $item.note.tag_info.title,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'liked_count': $item.note.liked_count
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      users_search: {
        id: 'users_search',
        backup: 'users_search_1',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书账号，获得账号列表',
        name: 'users',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/search-user/v2',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          keyword: 'String, keyword for query',
          page: 'number, For multi pages, Default is 1'
        },
        query_params_example: {
          keyword: 'momo',
          page: 1
        },
        docs_link: 'https://rapidapi.com/dataapiman/api/xiaohongshu-all-api/playground/apiendpoint_fe3e8ab0-8b7b-448c-9f9d-785ba1c8406d',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.users`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'name': $item.name,
            'desc': $item.desc,
            'sub_title': $item.sub_title,
            'official_verified': $item.official_verified,
            'image': $item.image,
            'room_id': $item.live.room_id,
            'has_goods': $item.live.has_goods
          }
        })`,
        limit: '',
        price: '',
        note: ''
      },
      get_user: {
        id: 'get_user',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的详情',
        name: 'userdetail',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user/v3',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          userId: 'String, userId for query; 格式需参考query_params_example中的格式，不是输入的关键字'
        },
        query_params_example: {
          userId: '648c8ada000000001c02b0f2'
        },
        docs_link: 'https://rapidapi.com/dataapiman/api/xiaohongshu-all-api/playground/apiendpoint_2dfd1e1c-d9d7-4f86-9a0a-6934a62ea1cd',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data`,
        flattener: '',
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      notes_comment_by_next_page: {
        id: 'notes_comment_by_next_page',
        backup: 'notes_comment_by_next_page_1',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个笔记/帖子的ID获取其评论列表',
        name: 'comments',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-note-comment/v2',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          noteId: 'String, Note ID for query; 格式需参考query_params_example中的格式，不是输入的关键字',
          lastCursor: '(optional)String, Paging parameters, enter previous page datas last comment ID(first page do not need enter).'
        },
        query_params_example: {
          noteId: '6683b283000000001f0052bf'
        },
        docs_link: 'https://rapidapi.com/dataapiman/api/xiaohongshu-all-api/playground/apiendpoint_8836fd68-5f19-4c38-98ff-34280bec06ad',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.comments`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'note_id': $item.note_id,
            'userid': $item.user.userid,
            'username': $item.user.nickname,
            'content': $item.content,
            'like_count': $item.like_count,
            'sub_comment_count': $item.sub_comment_count,
            'show_type': $item.show_type,
            'comment_type': $item.comment_type,
            'time': $item.time,
            'ip_location': $item.ip_location,
            'sub_comments': [$map($item.sub_comments, function($sc) {
              {
                'id': $sc.id,
                'content': $sc.content,
                'like_count': $sc.like_count,
                'username': $sc.user.nickname,
                'userid': $sc.user.userid,
                'time': $sc.time,
                'ip_location': $sc.ip_location
              }
            }), 'empty'][0]
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      get_note_list_1: {
        id: 'get_note_list_1',
        backup: 'get_note_list2',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的笔记/帖子的列表',
        name: 'notes',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user-note-list/v1',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          userId: 'String, User ID for query; 格式需参考query_params_example中的格式，不是输入的关键字',
          lastCursor: '(optional)String, Paging parameters, enter previous page datas last note ID(first page do not need enter).'
        },
        query_params_example: {
          userId: '648c8ada000000001c02b0f2'
        },
        docs_link: 'https://rapidapi.com/dataapiman/api/xiaohongshu-all-api/playground/apiendpoint_677d7a27-13e4-498d-ac34-6f3c2927fb64',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.notes`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'author': $item.user.nickname,
            'title': $item.title,
            'display_title': $item.display_title,
            'desc': $item.desc,
            'date': $item.create_time,
            'url': 'https://www.xiaohongshu.com/explore/' & $item.id,
            'collected_count': $item.collected_count,
            'shared_count': $item.share_count,
            'comments_count': $item.comments_count,
            'liked_count': $item.likes
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      fetch_comments_by_keyword: {
        id: 'fetch_comments_by_keyword',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据；如果用户没有明确要求取出评论，则不要选此选项。',
        name: 'notes_comments',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'notes_search',
        // The Second Request
        request2: 'notes_comment_by_next_page',
      },
      fetch_notes_and_comments_by_keyword: {
        id: 'fetch_notes_and_comments_by_keyword',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据；如果用户没有明确要求取出评论，则不要选此选项。',
        name: 'notes_comments',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'notes_search',
        // The Second Request
        request2: 'notes_comment_by_next_page',
      },
      notes_search_3: {
        id: 'notes_search_3',
        backup: '',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表',
        name: 'notes',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_search_notes',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          keywords: 'String, keyword for query',
          page: 'number, For multi pages, Default is 1',
          sort_type: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New)；这里优先使用popularity_descending',
          note_type: 'Enum: Note type(default: 0), 0: 综合(General), 1: 视频筛选(Video), 2: 图文筛选(Normal)'
        },
        query_params_example: {
          keywords: 'dance',
          page: 1,
          sort_type: 'popularity_descending',
          note_type: '0'
        },
        docs_link: 'https://docs.tikhub.io/268383320e0',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: true,
        data_path: `$.data.data.items`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'userid': $item.note_card.user.user_id,
            'author': $item.note_card.user.nick_name,
            'display_title': $item.note_card.display_title,
            'type': $item.note_card.type,
            'date': $item.note_card.corner_tag_info[0].text,
            'collected_count': $item.note_card.interact_info.collected_count,
            'shared_count': $item.note_card.interact_info.shared_count,
            'comment_count': $item.note_card.interact_info.comment_count,
            'liked_count': $item.note_card.interact_info.liked_count
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      notes_search_2: {
        id: 'notes_search_2',
        backup: 'notes_search_3',
        priority: 2,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表',
        name: 'notes',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/app/search_notes',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          keyword: 'String, keyword for query',
          page: 'number, For multi pages, Default is 1',
          sort_type: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New)；这里优先使用popularity_descending',
          filter_note_type: 'Enum: Note type(default: 0), 0: 综合(General), 1: 视频筛选(Video), 2: 图文筛选(Normal)',
          filter_note_time: '(optional)String, 一天内: 一天内(within one day), 一周内: 一周内(within a week), 半年内: 半年内(Within half a year)；如果用户没有指定，则有些填写半年内'
        },
        query_params_example: {
          keyword: 'dance',
          page: 1,
          sort_type: 'popularity_descending',
          filter_note_type: '%E5%8D%8A%E5%B9%B4%E5%86%85'
        },
        docs_link: 'https://docs.tikhub.io/310965843e0',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: true,
        data_path: `$.data.data.data.items`,
        flattener: `$map($, function($item) {
          {
            'id': $item.note.id,
            'author': $item.note.user.nickname,
            'title': $item.note.title,
            'display_title': $item.note.abstract_show,
            'desc': $item.note.desc,
            'date': [$item.note.timestamp, 0][0],
            'type': $item.note.type,
            'tags': $item.note.tag_info.title,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'liked_count': $item.note.liked_count
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      notes_search: {
        id: 'notes_search',
        backup: 'notes_search_1',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表',
        name: 'notes',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/note/search',
        method: 'POST',
        headers: {
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Connection: "keep-alive",
          Origin: "https://xh.newrank.cn",
          Referer: "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          request_id: "e651f806eda645969f420770d8f7767d",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Cookie: "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=1a0c399b17510231665212799e0071ce8392a600627de72adc94258c311970; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uJKEfiKhluZeLM/PSOpqsVU",
        },
        query_params: {},
        query_params_desc: {
          baseInfoRequest: {
            "type": "",
            "createTime": "30d",
            "contentTags": "一般为空，不需要填写；是一个数组[]，根据用户的背景确定，如果用户背景为空，则此项为空；取值范围为['合集', '教程', 'ootd', '测评', '探店', 'vlog', '沉浸式', '仿妆', '彩妆试色', 'plog', '开箱', '成分解析', '日系', '氛围感', '高级感', '校园风', '韩系', '复古', '中性风', '甜酷', '纯欲', '欧美风', '低脂低卡', '自律生活', '职场生活', '极简主义', '露营徒步', '痘痘肌', '黄皮', '敏感肌', '干皮', '白皮', '油皮', '瑕疵皮', '混合肌', '隔离防晒', '保湿补水', '抗老', '控油', '祛痘祛闭口', '祛黄', '眼部护理', '修复', '抗氧化', '美白', '抗炎', '去皱', '淡斑']中的0~5项；不要超过5个，一定不要有这些范围之外的内容。",
            "firstType": "一般为空，不需要填写；根据用户的背景确定，如果用户背景为空，则此项为空；取值范围为这个数组[美妆', '美容个护', '鞋包潮玩', '穿搭打扮', '美食', '母婴育儿', '旅游出行', '家居家装', '教育', '生活', '运动健身', '兴趣爱好', '影视综', '婚嫁', '摄影摄像', '萌宠', '情感星座', '科技互联网', '资讯', '健康养生', '科学科普', '职场', '交通工具', '其他']中的一项,或者空；不要有这些项之外的内容",
            "noteType": ""
          },
          custom: {},
          endTime: "",
          filterIncomplete: 0,
          high: {
            "likedCountRange": {
              "fixedRange": "此项为空，不要填写",
              "customizeRange": "数量范围，如'100-: 大于100', '100-200: 指100到200之间'"
            },
            "collectedCountRange": {
              "fixedRange": "此项为空，不要填写",
              "customizeRange": "数量范围，如'100-: 大于100', '100-200: 指100到200之间'"
            },
            "commentsCountRange": {
              "fixedRange": "此项为空，不要填写",
              "customizeRange": "数量范围，如'100-: 大于100', '100-200: 指100到200之间'"
            },
            "sharedCountRange": {
              "fixedRange": "此项为空，不要填写",
              "customizeRange": "数量范围，如'100-: 大于100', '100-200: 指100到200之间'"
            }
          },
          input: {
            "keyword": "String, keyword for query, 如三伏贴；只需填写此项，其他项都不需要修改",
            "type": [
              "title",
              "topic",
              "content",
              "tag",
              "name",
              "categoryName",
              "seedBrandName"
            ]
          },
          size: 20,
          sort: "likedCount",
          source: {
            "type": "",
            "keyword": ""
          },
          start: 1,
          startTime: "",
          time: "30d"
        },
        query_params_example: {
          baseInfoRequest: {
            "type": "",
            "createTime": "30d",
            "contentTags": [],
            "firstType": "",
            "noteType": ""
          },
          custom: {},
          endTime: "",
          filterIncomplete: 0,
          high: {
            "likedCountRange": {
              "fixedRange": "",
              "customizeRange": "100-"
            },
            "collectedCountRange": {
              "fixedRange": "",
              "customizeRange": "100-200"
            },
            "commentsCountRange": {
              "fixedRange": "",
              "customizeRange": "200-"
            },
            "sharedCountRange": {
              "fixedRange": "",
              "customizeRange": "10-300"
            }
          },
          input: {
            "keyword": "三伏贴",
            "type": [
              "title",
              "topic",
              "content",
              "tag",
              "name",
              "categoryName",
              "seedBrandName"
            ]
          },
          size: 20,
          sort: "likedCount",
          source: {
            "type": "",
            "keyword": ""
          },
          start: 1,
          startTime: "",
          time: "30d"
        },
        docs_link: '',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: true,
        data_path: `$.data.data.list`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'author': $item.user.nickname,
            'userid': $item.user.userid,
            'title': $item.title,
            'desc': $item.desc,
            'url': 'https://www.xiaohongshu.com/explore/' & $item.id,
            'type': $item.type,
            'topics': $item.topics,
            'cover': $item.cover,
            'noteCounterTypeV1': $item.noteCounterTypeV1,
            'collectedCount': $item.collectedCount,
            'sharedCount': $item.sharedCount,
            'commentsCount': $item.commentsCount,
            'likedCount': $item.likedCount,
            'readCount': $item.readCount,
            'predReadnum': $item.predReadnum,
            'createTime': $item.createTime
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      notes_comment_by_next_page_1: {
        id: 'notes_comment_by_next_page_1',
        backup: '',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个笔记/帖子的ID获取其评论列表',
        name: 'note_comments',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_note_comments',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          note_id: 'String, Note ID for query; 格式需参考query_params_example中的格式，不是输入的关键字',
          cursor: '(optional)String, Paging parameters, enter previous page datas last comment ID(first page do not need enter).'
        },
        query_params_example: {
          note_id: '6683b283000000001f0052bf'
        },
        docs_link: 'https://docs.tikhub.io/268383322e0',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.comments`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'note_id': $item.note_id,
            'userid': $item.user.userid,
            'username': $item.user.nickname,
            'content': $item.content,
            'like_count': $item.like_count,
            'sub_comment_count': $item.sub_comment_count,
            'show_type': $item.show_type,
            'comment_type': $item.comment_type,
            'time': $item.time,
            'sub_comments': [$map($item.sub_comments, function($sc) {
              {
                'id': $sc.id,
                'content': $sc.content,
                'like_count': $sc.like_count,
                'username': $sc.user.nickname,
                'userid': $sc.user.userid,
                'time': $sc.time
              }
            }), 'empty'][0]
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      get_note_list: {
        id: 'get_note_list',
        backup: 'get_note_list_1',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的笔记/帖子的列表',
        name: 'notes',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/red/user/detail/noteAna/list',
        method: 'POST',
        headers: {
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
          "Origin": "https://xh.newrank.cn",
          "Pragma": "no-cache",
          "Referer": "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          "request_id": "68871e7bdc50451cbcdef1d78a66464c",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": `sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=0a472f9117510971469837018e006f7bafa7da6725ea452f82915f445a8596; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uJBmptIL2kt8B6OFSw7K1nG`,
        },
        query_params: {},
        query_params_desc: {
          "rid": "String, User ID for query; 格式需参考query_params_example中的格式，不是输入的关键字",
          "sort": "likedCount",
          "type": "",
          "bistype": "",
          "featureType": "",
          "isHideDelete": "0",
          "isCooperate": "",
          "title": "保持为空，不要填写此项",
          "size": 20,
          "start": 1,
          "time": "30d",
          "startTime": "",
          "endTime": ""
        },
        query_params_example: {
          "rid": '648c8ada000000001c02b0f2',
          "sort": "likedCount",
          "type": "",
          "bistype": "",
          "featureType": "",
          "isHideDelete": "0",
          "isCooperate": "",
          "title": "",
          "size": 20,
          "start": 1,
          "time": "30d",
          "startTime": "",
          "endTime": ""
        },
        docs_link: '',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: `$map($, function($item) {
          {
            'id': $item.id,
            'author': $item.user.nickname,
            'title': $item.title,
            'userid': $item.user.userid,
            'type': $item.type,
            'desc': $item.desc,
            'cover': $item.cover,
            'url': 'https://www.xiaohongshu.com/explore/' & $item.id,
            'noteCounterTypeV1': $item.noteCounterTypeV1,
            'collectedCount': $item.collectedCount,
            'sharedCount': $item.sharedCount,
            'commentsCount': $item.commentsCount,
            'likedCount': $item.likedCount,
            'predReadnum': $item.predReadnum,
            'createTime': $item.createTime
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      get_note_list2: {
        id: 'get_note_list2',
        backup: 'get_note_list_app',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的笔记/帖子的列表',
        name: 'notes',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_home_notes',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          user_id: 'String, User ID for query; 格式需参考query_params_example中的格式，不是输入的关键字',
          cursor: '(optional)String, Paging parameters, enter previous page datas last note ID(first page do not need enter).'
        },
        query_params_example: {
          user_id: '648c8ada000000001c02b0f2'
        },
        docs_link: 'https://api.tikhub.io/#/Xiaohongshu-Web-V2-API/fetch_home_notes_api_v1_xiaohongshu_web_v2_fetch_home_notes_get',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.notes`,
        flattener: `$map($, function($item) {
          {
            'id': $item.note_id,
            'author': $item.user.nickname,
            'title': $item.title,
            'display_title': $item.display_title,
            'userid': $item.user.user_id,
            'type': $item.type,
            'url': 'https://www.xiaohongshu.com/explore/' & $item.note_id,
            'collected_count': $item.interact_info.collected_count,
            'shared_count': $item.interact_info.shared_count,
            'comment_count': $item.interact_info.comment_count,
            'liked_count': $item.interact_info.liked_count
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      get_note_list_app: {
        id: 'get_note_list_app',
        backup: '',
        priority: 2,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的笔记/帖子的列表',
        name: 'notes',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_home_notes_app',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          user_id: 'String, User ID for query; 格式需参考query_params_example中的格式，不是输入的关键字',
          cursor: '(optional)String, Paging parameters, enter previous page datas last note ID(first page do not need enter).'
        },
        query_params_example: {
          user_id: '648c8ada000000001c02b0f2'
        },
        docs_link: 'https://api.tikhub.io/#/Xiaohongshu-Web-V2-API/fetch_home_notes_app_api_v1_xiaohongshu_web_v2_fetch_home_notes_app_get',
        could_cached: false,
        cached_expired: 3600000 * 24,
        filter: false,
        data_path: `$.data.data.notes`,
        flattener: `$map($, function($item) {
          {
            'id': $item.note_id,
            'author': $item.user.nickname,
            'title': $item.title,
            'display_title': $item.display_title,
            'userid': $item.user.user_id,
            'type': $item.type,
            'url': 'https://www.xiaohongshu.com/explore/' & $item.note_id,
            'collected_count': $item.interact_info.collected_count,
            'shared_count': $item.interact_info.shared_count,
            'comment_count': $item.interact_info.comment_count,
            'liked_count': $item.interact_info.liked_count
          }
        })`,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      hot_words: {
        id: 'hot_words',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以获得近期火热的热词/热搜词等',
        name: 'hotwords',
        url: 'https://gw.newrank.cn/api/xhsv2/nr/app/xh/v2/rank/hotWordHotList',
        method: 'POST',
        headers: {
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Connection: "keep-alive",
          Origin: "https://xh.newrank.cn",
          Referer: "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          request_id: "de20371fe270480c9f5e9d512a71bbbf",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Cookie: "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=0a47314717509101764217962e0082f92cc256acdfea91b77aa9cba53201d4; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uIE/lKXUzoEEKWz1iQcnERC",
        },
        query_params: {},
        query_params_desc: {
          typeV1: "",
          typeV2: "",
          rankType: "day",
          rankDate: "Date of 2 days ago: e.g. 2025-06-20",
          recentType: "",
          size: 30,
          start: 1,
          isNew: "",
          isBoom: "",
          sort: "hot_score"
        },
        query_params_example: {
          typeV1: "",
          typeV2: "",
          rankType: "day",
          rankDate: "2025-06-20",
          recentType: "",
          size: 30,
          start: 1,
          isNew: "",
          isBoom: "",
          sort: "hot_score"
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      topic_rank: {
        id: 'topic_rank',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以获得近期流行的话题/Tag等',
        name: 'topics',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/topicRank',
        method: 'POST',
        headers: {
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Connection: "keep-alive",
          Origin: "https://xh.newrank.cn",
          Referer: "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          request_id: "0705b9f8a93a43dba51e0105bd963011",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Cookie: "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; auth_n=gAYRkPLPqVNEdAlUCNsEP2z3q1lpAjBrfNhCfzCwGlbRrXfVMlO5j9ecqIjxdzle; acw_tc=ac11000117510767557453372e007cc0aa72c50c673c0c18469f742ef5eb37",
        },
        query_params: {},
        query_params_desc: {
          type: "\u5168\u90E8",
          topicSecondType: "",
          dateType: 1,
          rankDate: "Date of 2 days ago: e.g. 2025-06-20",
          isBrandTopic: "0",
          sort: "interactiveCount",
          size: 30,
          start: 1,
        },
        query_params_example: {
          type: "\u5168\u90E8",
          topicSecondType: "",
          dateType: 1,
          rankDate: "2025-06-20",
          isBrandTopic: "0",
          sort: "interactiveCount",
          size: 30,
          start: 1,
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      koc_search: {
        id: 'koc_search',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据账号关键字搜索红人/KOC/账号的基本画像，包括其基础信息、内容特征、粉丝画像、商业指标等',
        name: 'kocs',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/red/user/search',
        method: 'POST',
        headers: {
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
          "Origin": "https://xh.newrank.cn",
          "Pragma": "no-cache",
          "Referer": "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          "request_id": "4fb2ca2352f94cf2b20bf23a86a12860",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": `sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; auth_n=gAYRkPLPqVNEdAlUCNsEP2z3q1lpAjBrfNhCfzCwGlbRrXfVMlO5j9ecqIjxdzle; acw_tc=ac11000117510767557453372e007cc0aa72c50c673c0c18469f742ef5eb37`,
        },
        query_params: {},
        query_params_desc: {
          activeId: "B5F3D1C1BF084B508CEBED4543B5F3D1",
          baseReq: {},
          batchId: "",
          batchName: "",
          contentTags: "为空，不需要填写；是一个数组[]，根据用户的背景确定，取值范围为['合集', '教程', 'ootd', '测评', '探店', 'vlog', '沉浸式', '仿妆', '彩妆试色', 'plog', '开箱', '成分解析', '日系', '氛围感', '高级感', '校园风', '韩系', '复古', '中性风', '甜酷', '纯欲', '欧美风', '低脂低卡', '自律生活', '职场生活', '极简主义', '露营徒步', '痘痘肌', '黄皮', '敏感肌', '干皮', '白皮', '油皮', '瑕疵皮', '混合肌', '隔离防晒', '保湿补水', '抗老', '控油', '祛痘祛闭口', '祛黄', '眼部护理', '修复', '抗氧化', '美白', '抗炎', '去皱', '淡斑]中的0~5项；不要超过5个，一定不要有这些范围之外的内容。",
          custom: {},
          cycle: "30d",
          dataReq: {
            "picturePrice": {
              "fixedRange": "预算，根据用户输入确定，取值为【<1000，1000-3000，3000-10000，10000-100000，>100000】中的一个",
              "customizeRange": "为空，不要填写"
            }
          },
          fansReq: {
            distribute: "0, or 1, or empty",
            province: "为空，不要填写",
            hobby: `['家居家装', '宠物', '知识', '母婴', '摄影', '资讯', '星座命理', '萌娃', '减肥',
              '运动健身', '科技数码', '体育赛事', '商业财经', '出行', '汽车', '搞笑', '美妆', '美食测评',
              '文化', '教育', '兴趣爱好', '生活记录', '社科', '美食教程', '美食', '影视', '娱乐', '游戏',
              '时尚', '健康', '婚嫁', '素材', '美女帅哥', '潮流', '情感']中的一个或多个`,
            age: `['<18', '18-24', '25-34', '35-44', '>44']中的一个或多个`
          },
          input: {keyword: "Search Keyword, 如红酒", type: ["name", "desc", "auth", "tag", "location", "rid"]},
          isBrand: "",
          isContact: "",
          isGood: "",
          isInSq: "",
          isLive: "",
          isLivedata: "",
          isRecommend: "",
          pgyLevel: "",
          recommendNum: [],
          recommendType: "",
          size: 20,
          sort: "",
          start: 1,
          type: {
            first: "根据用户的背景或输入确定，这个数组['美妆', '美容个护', '鞋包潮玩', '穿搭打扮', '美食', '母婴育儿', '旅游出行', '家居家装', '教育', '生活', '运动健身', '兴趣爱好', '影视综', '婚嫁', '摄影摄像', '萌宠', '情感星座', '科技互联网', '资讯', '健康养生', '科学科普', '职场', '交通工具', '其他']中的一项，或者空；不要有这些项之外的内容",
            second: []
          },
          xhsRedUserPgyReq: {pgyPersonaltags: []}
        },
        query_params_example: {
          activeId: "B5F3D1C1BF084B508CEBED4543B5F3D1",
          baseReq: {},
          batchId: "",
          batchName: "",
          contentTags: [],
          custom: {},
          cycle: "30d",
          dataReq: {
            "picturePrice": {
              "fixedRange": "1000-3000",
              "customizeRange": ""
            }
          },
          fansReq: {
            distribute: "",
            province: "",
            hobby: ['宠物', '知识'],
            age: ['<18', '18-24']
          },
          input: {keyword: "红酒", type: ["name", "desc", "auth", "tag", "location", "rid"]},
          isBrand: "",
          isContact: "",
          isGood: "",
          isInSq: "",
          isLive: "",
          isLivedata: "",
          isRecommend: "",
          pgyLevel: "",
          recommendNum: [],
          recommendType: "",
          size: 20,
          sort: "",
          start: 1,
          type: {first: "", second: []},
          xhsRedUserPgyReq: {pgyPersonaltags: []}
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      user_search_by_content: {
        id: 'user_search_by_content',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据笔记/帖子中的内容进行关键字搜索，以找到相关红人/KOC/账号的基本信息，画像',
        name: 'user_by_content',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/red/user/searchUserByContent',
        method: 'POST',
        headers: {
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
          "Origin": "https://xh.newrank.cn",
          "Pragma": "no-cache",
          "Referer": "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          "request_id": "d2f4149f97694a6f9066685ba2e4c70a",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": `sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; auth_n=gAYRkPLPqVNEdAlUCNsEP2z3q1lpAjBrfNhCfzCwGlbRrXfVMlO5j9ecqIjxdzle; acw_tc=ac11000117510767557453372e007cc0aa72c50c673c0c18469f742ef5eb37`,
        },
        query_params: {},
        query_params_desc: {
          baseReq: {},
          dataReq: {
            "picturePrice": {
              "fixedRange": "预算，根据用户输入确定，取值为【<1000，1000-3000，3000-10000，10000-100000，>100000】中的一个",
              "customizeRange": ""
            }
          },
          fansReq: {
            distribute: "",
            province: "为空，不要填写"
          },
          keyword: "Search Keyword, 如红酒；",
          isBrand: "",
          isContact: "",
          isGood: "",
          isLive: "",
          isRecommend: "",
          size: 20,
          sort: "noteCount",
          start: 1,
          time: "30d",
          type: {
            first: "根据用户的背景或输入确定，这个数组['美妆', '美容个护', '鞋包潮玩', '穿搭打扮', '美食', '母婴育儿', '旅游出行', '家居家装', '教育', '生活', '运动健身', '兴趣爱好', '影视综', '婚嫁', '摄影摄像', '萌宠', '情感星座', '科技互联网', '资讯', '健康养生', '科学科普', '职场', '交通工具', '其他']中的一项，或者空；不要有这些项之外的内容",
            second: []
          },
          startTime: "",
          endTime: ""
        },
        query_params_example: {
          baseReq: {},
          dataReq: {
            "picturePrice": {
              "fixedRange": "1000-3000",
              "customizeRange": ""
            }
          },
          fansReq: {
            distribute: "",
            province: ""
          },
          keyword: "Labubu",
          isBrand: "",
          isContact: "",
          isGood: "",
          isLive: "",
          isRecommend: "",
          size: 20,
          sort: "noteCount",
          start: 1,
          time: "30d",
          type: {first: "", second: []},
          startTime: "",
          endTime: ""
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      industry_rank: {
        id: 'industry_rank',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据领域/频道/分类获取红人榜单，包括其基础信息、粉丝/点赞/收藏数量、指数等',
        name: 'rank',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/rank/industryRank',
        method: 'POST',
        headers: {
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
          "Origin": "https://xh.newrank.cn",
          "Pragma": "no-cache",
          "Referer": "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          "request_id": "052584ce20744a66ba0df765cef9b51a",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=0a47314717509101764217962e0082f92cc256acdfea91b77aa9cba53201d4; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uLD8eoU9E/+AlLiD+5BOHAo",
        },
        query_params: {},
        query_params_desc: {
          dateType: "3",
          rankDate: "Date of the first day of last month: e.g. 2025-05-01",
          size: 20,
          start: 1,
          'subType.first': "Same as type",
          'subType.second': "",
          type: "Search keyword: 根据用户的背景或输入确定，可选范围为：['美妆', '美容个护', '鞋包潮玩', '穿搭打扮', '美食', '母婴育儿', '旅游出行', '家居家装', '教育', '生活', '运动健身', '兴趣爱好', '影视综', '婚嫁', '摄影摄像', '萌宠', '情感星座', '科技互联网', '资讯', '健康养生', '科学科普', '职场', '交通工具', '其他']中的一个，或者空；不要有这些项之外的内容",
        },
        query_params_example: {
          dateType: "3",
          rankDate: "2025-05-01",
          size: 20,
          start: 1,
          'subType.first': "美妆",
          'subType.second': "",
          type: "美妆",
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data.list`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      koc_image: {
        id: 'koc_image',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据ID获取KOC的详细画像，包括其账号概览、粉丝分析、笔记分析、投放分析、品牌推广、品类分析、直播分析等',
        name: 'KocImage',
        url: 'https://gw.newrank.cn/api/xh/xdnphb/nr/app/xhs/red/user/detail/fan/image',
        method: 'POST',
        headers: {
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
          "Origin": "https://xh.newrank.cn",
          "Pragma": "no-cache",
          "Referer": "https://xh.newrank.cn/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "content-type": "application/json",
          "n-token": "35c430ef650b459ba2b9c1409148d929",
          "request_id": "1731247c3b954f7db4b9f8b70bf19ae8",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=0a47314717509101764217962e0082f92cc256acdfea91b77aa9cba53201d4; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uIE/lKXUzoEEKWz1iQcnERC",
        },
        query_params: {},
        query_params_desc: {
          rid: "UserId of the account, e.g. 6204d8f30000000021022ff2; 格式需参考query_params_example中的格式，不是输入的关键字"
        },
        query_params_example: {
          rid: "6204d8f30000000021022ff2"
        },
        docs_link: '',
        could_cached: true,
        cached_expired: 3600000 * 24 * 7,
        filter: false,
        data_path: `$.data.data`,
        flattener: ``,
        limit: '',
        price: '',
        dev: '',
        verification: '',
        output: '',
        note: ''
      },
      top_trend: {
        id: 'top_trend',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '读取小红书等平台的热词/热搜词，以及热门话题/Tag；仅用以热词热搜热门话题Tag，如果用户要找内容/笔记/帖子等不适合此选项',
        name: 'toptrend',
        // Excute Data Dependency
        execute_depend: 'chain', // ['chain', 'chain_loop']
        // The First Request
        request1: 'hot_words',
        // The Second Request
        request2: 'topic_rank',
      },
      koc_imitate: {
        id: 'koc_imitate',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '优秀账号对标，根据我的产品、业务和背景等搜索到合适的对标网红KOC，及其热门笔记；该操作能获得KOC列表和其内容列表两类数据',
        name: 'KocAnalysis',
        // Excute Data Dependency
        execute_depend: 'chain_new_param', // ['chain', 'chain_loop']
        // The First Request
        request1: 'koc_search',
        // The Second Request
        request2: 'user_search_by_content',
        // The 3rd Request
        request3: 'get_note_list',
      },
      koc_evaluate: {
        id: 'koc_evaluate',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '达人合作评估，根据给定的达人网红KOC账号信息，找到其详细画像，对其进行合作评估；该操作能获得KOC画像和其内容列表两类数据',
        name: 'KocEvaluate',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'koc_image',
        // The Second Request
        request2: 'get_note_list',
      },
    };
    const api = apiList[api_desc];
    if (api && api.execute_depend) {
      return { ...apiList[api.request1], ...api };
    }
    return api;
  }

  static async getUserDataBucket(userId: UUID) {
    const buckets = [
      {
			'model_type': 'note',
			'note': {
				'tag_info': {
					'type': '',
					'title': ''
				},
				'timestamp': 1715940777,
				'desc': '1、比别人更年轻 2、提升记忆力 3、身体不容易发福 4、没有蛀牙 葡萄酒再好，也不要贪杯喔 #葡萄酒  #今夜来一杯微',
				'result_from': '',
				'shared_count': 57,
				'title': '晚上喝红酒，到底好不好！',
				'has_music': false,
				'last_update_time': 1716043421,
				'collected_count': 187,
				'comments_count': 79,
				'id': '66472da90000000005006256',
				'widgets_context': '{"flags":{},"author_id":"63bd42cd000000002600710d","author_name":"念微醺"}',
				'collected': false,
				'nice_count': 0,
				'niced': false,
				'liked': false,
				'debug_info_str': '',
				'advanced_widgets_groups': {
					'groups': [{
						'mode': 1,
						'fetch_types': ['guos_test', 'note_next_step', 'second_jump_bar', 'cooperate_binds', 'note_collection', 'rec_next_infos', 'image_stickers', 'image_filters', 'product_review', 'related_search', 'cooperate_comment_component', 'image_goods_cards', 'ads_goods_cards', 'ads_comment_component', 'goods_card_v2', 'image_template', 'buyable_goods_card_v2', 'ads_engage_bar', 'challenge_card', 'cooperate_engage_bar', 'guide_post', 'pgy_comment_component', 'pgy_engage_bar', 'bar_below_image', 'aigc_collection', 'co_produce', 'widgets_ndb', 'next_note_guide', 'pgy_bbc_exp', 'async_group', 'super_activity', 'widgets_enhance', 'music_player', 'soundtrack_player']
					}, {
						'mode': 0,
						'fetch_types': ['guos_test', 'vote_stickers', 'bullet_comment_lead', 'note_search_box', 'interact_pk', 'interact_vote', 'guide_heuristic', 'share_to_msg', 'follow_guide', 'note_share_prompt_v1', 'sync_group', 'group_share', 'share_guide_bubble', 'widgets_share', 'guide_navigator']
					}]
				},
				'interaction_area': {
					'status': false,
					'text': '772',
					'type': 1
				},
				'update_time': 1719318002000,
				'type': 'normal',
				'images_list': [{
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60',
					'height': 2560,
					'width': 1920,
					'url': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60?imageView2/2/w/540/format/jpg/q/75%7CimageMogr2/strip&redImage/frame/0&ap=5&sc=SRH_PRV'
				}, {
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0',
					'height': 2560,
					'width': 1920
				}, {
					'trace_id': '1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo',
					'height': 2560,
					'width': 1920,
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': ''
				}, {
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg',
					'height': 2560,
					'width': 1920,
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg'
				}],
				'abstract_show': '晚上喝红酒，到底好不好！😮…#美容养颜 #葡萄酒 #今夜来一杯微醺酒 #适合女生喝的酒 #红酒 #健康生活',
				'liked_count': 772,
				'cover_image_index': 0,
				'corner_tag_info': [{
					'text_en': '',
					'style': 0,
					'location': -1,
					'type': 'ubt_sig_token',
					'icon': '',
					'text': 'RAEC2QLKIeYTlcAsExNeHdaHL/Z4lnWZYpVDPWphUZZ9j+Ru5J/iEl68wXRXMb4vFTbOxXfbYC6Z5IUS5iQqstyiIQ/6nu1uhB'
				}, {
					'type': 'publish_time',
					'icon': 'http://picasso-static.xiaohongshu.com/fe-platform/e9b67af62f67d9d6cfac936f96ad10a85fdb868e.png',
					'text': '2024-05-18',
					'text_en': '2024-05-18',
					'style': 0,
					'location': 5
				}],
				'extract_text_enabled': 0,
				'user': {
					'red_id': '6732656693',
					'red_official_verify_type': 0,
					'red_official_verified': false,
					'track_duration': 0,
					'followed': false,
					'nickname': '念微醺',
					'images': 'https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo310gpa3oq6e5g5ott8b6pgs8dbod8ku8?imageView2/2/w/80/format/jpg',
					'show_red_official_verify_icon': false,
					'userid': '63bd42cd000000002600710d'
				},
				'geo_info': {
					'distance': ''
				},
				'note_attributes': []
			}
    },
      {
                "score": 57, 
                "status": 0, 
                "sub_comments": [
                    {
                        "user": {}, 
                        "comment_type": 0, 
                        "note_id": "66472da90000000005006256", 
                        "score": -4, 
                        "friend_liked_msg": "", 
                        "text_language_code": "zh-Hans", 
                        "content": "喜欢偏甜还是喜欢酸涩感强一些的呢", 
                        "at_users": [ ], 
                        "show_type": "common", 
                        "show_tags": [1], 
                        "target_comment": {}, 
                        "id": "6729b4c0000000001b003a28", 
                        "like_count": 0, 
                        "liked": false, 
                        "hidden": false, 
                        "status": 0, 
                        "time": 1730786497, 
                        "biz_label": {}
                    }
                ], 
                "user": {
                    "images": "https://sns-avatar-qc.xhscdn.com/avatar/5bd3147724952a0001b9804b.jpg?imageView2/2/w/120/format/jpg", 
                    "red_id": "620372106", 
                    "level": {
                        "image": ""
                    }, 
                    "additional_tags": { }, 
                    "ai_agent": false, 
                    "userid": "5bd313d73a2b6700015ef04c", 
                    "nickname": "Chachaxxzzz"
                }, 
                "track_id": "interaction-service.local", 
                "friend_liked_msg": "", 
                "at_users": [ ], 
                "liked": false, 
                "text_language_code": "zh-Hans", 
                "time": 1730261197, 
                "biz_label": {
                    "product_review": false, 
                    "group_invite": "false", 
                    "rich_text": "unknown"
                }, 
                "sub_comment_cursor": "{\"cursor\":\"6729b4c0000000001b003a28\",\"index\":1}", 
                "content": "有红酒推荐吗？价格不要太高", 
                "like_count": 2, 
                "show_tags": [ ], 
                "show_type": "common", 
                "comment_type": 0, 
                "hidden": false, 
                "sub_comment_count": 10, 
                "id": "6721b0cd00000000170248d5", 
                "note_id": "66472da90000000005006256"
            },

    ];
    return buckets;
  }
}
