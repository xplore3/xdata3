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
      'hot_words: 用以获得近期火热的热词/热搜词等',
      'topic_rank: 用以获得近期流行的话题/Tag等',
      'koc_search: 根据关键字搜索红人的基本画像，包括其基础信息、内容特征、粉丝画像、商业指标等',
      'koc_image: 根据ID获取KOC的详细画像，包括其账号概览、粉丝分析、笔记分析、投放分析、品牌推广、品类分析、直播分析等',
      'industry_rank: 根据领域/频道获取红人榜单，包括其基础信息、粉丝/点赞/收藏数量、指数等',
      'koc_imitate: 优秀内容对标，根据我的产品、业务和背景等搜索到合适的对标网红KOC；该操作能获得KOC列表和其内容列表两类数据',
      'koc_evaluate: 达人合作评估，根据给定的达人网红KOC账号信息，找到其详细画像，对其进行合作评估；该操作能获得KOC画像和其内容列表两类数据',
      'notes_search: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表. Parameters: keyword (search term), sort (popularity_descending or time_descending).',
      //'note_detail: 通过noteid获取单个笔记/帖子/note的详情',
      'users_search: 用以通过关键字搜索小红书账号，获得账号列表',
      'get_user: 用以通过单个小红书账号ID获取该账号的详情',
      'notes_comment_by_next_page: 用以通过单个笔记/帖子的ID获取其评论列表',
      'fetch_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据',
      'fetch_notes_and_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据. Parameters: keyword (search term), sort (popularity_descending or time_descending).',
      'get_note_list: 用以通过单个小红书账号ID获取该账号的笔记/帖子的列表'
    ];
    return sources;
  }

  static getApi(api_desc: string) {
    const apiList = {
      notes_search: {
        id: 'notes_search',
        backup: 'notes_search_1',
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
          sort: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New), comment_descending: 最多评论(Comment Desc), collect_descending: 最多收藏(Collect Desc)',
          noteType: 'Enum: Note type(default: _0), _0: 综合(General), _1: 视频筛选(Video), _2: 图文筛选(Normal), _3:直播筛选(Live)',
          noteTime: '(optional)String, 一天内: 一天内(within one day), 一周内: 一周内(within a week), 半年内: 半年内(Within half a year)'
        },
        query_params_example: {
          keyword: 'dance',
          page: 1,
          sort: 'general',
          noteType: '_0',
          noteTime: '%E4%B8%80%E5%A4%A9%E5%86%85'
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
            'url': $item.note.images_list[0].url,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'liked_count': $item.note.liked_count
          }
        })`,
        limit: '',
        price: '',
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
        name: 'user',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user/v3',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          userId: 'String, userId for query'
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
          noteId: 'String, Note ID for query',
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
        note: ''
      },
      get_note_list: {
        id: 'get_note_list',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个小红书账号ID获取该账号的笔记/帖子的列表',
        name: 'user_notes',
        url: 'https://xiaohongshu-all-api.p.rapidapi.com/api/xiaohongshu/get-user-note-list/v1',
        method: 'GET',
        headers: {
          "x-rapidapi-host": "xiaohongshu-all-api.p.rapidapi.com",
          "x-rapidapi-key": `${process.env.RAPIDAPI_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          userId: 'String, User ID for query',
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
            'collected_count': $item.collected_count,
            'shared_count': $item.share_count,
            'comments_count': $item.comments_count,
            'liked_count': $item.likes
          }
        })`,
        limit: '',
        price: '',
        note: ''
      },
      fetch_comments_by_keyword: {
        id: 'fetch_comments_by_keyword',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据',
        name: 'user_notes',
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
        description: '用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据. Parameters: keyword (search term), sort (popularity_descending or time_descending).',
        name: 'user_notes',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'notes_search',
        // The Second Request
        request2: 'notes_comment_by_next_page',
      },
      notes_search_1: {
        id: 'notes_search_1',
        backup: 'notes_search_2',
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
          sort_type: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New)',
          note_type: 'Enum: Note type(default: 0), 0: 综合(General), 1: 视频筛选(Video), 2: 图文筛选(Normal)'
        },
        query_params_example: {
          keywords: 'dance',
          page: 1,
          sort_type: 'general',
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
            'url': $item.note_card.cover.url_default,
            'collected_count': $item.note_card.interact_info.collected_count,
            'shared_count': $item.note_card.interact_info.shared_count,
            'comment_count': $item.note_card.interact_info.comment_count,
            'liked_count': $item.note_card.interact_info.liked_count
          }
        })`,
        limit: '',
        price: '',
        note: ''
      },
      notes_search_2: {
        id: 'notes_search_2',
        backup: '',
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
          sort_type: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New)',
          filter_note_type: 'Enum: Note type(default: 0), 0: 综合(General), 1: 视频筛选(Video), 2: 图文筛选(Normal)',
          filter_note_time: '(optional)String, 一天内: 一天内(within one day), 一周内: 一周内(within a week), 半年内: 半年内(Within half a year)'
        },
        query_params_example: {
          keyword: 'dance',
          page: 1,
          sort_type: 'general',
          filter_note_type: '0'
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
            'url': $item.note.images_list[0].url,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'liked_count': $item.note.liked_count
          }
        })`,
        limit: '',
        price: '',
        note: ''
      },
      notes_comment_by_next_page_1: {
        id: 'notes_comment_by_next_page_1',
        backup: '',
        priority: 1,
        type: 'social-media',
        platform: 'rednote',
        description: '用以通过单个笔记/帖子的ID获取其评论列表',
        name: 'comments',
        url: 'https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_note_comments',
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.TIKHUB_API_KEY}`,
        },
        query_params: {},
        query_params_desc: {
          note_id: 'String, Note ID for query',
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
        note: ''
      },
      hot_words: {
        id: 'hot_words',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以获得近期火热的热词/热搜词等',
        name: 'hot_words',
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
          request_id: "ed4c43c5cde841a3b0c3f7f8f29fdd72",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Cookie: "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=1a0c39a017507148997454957e006418bff5aa457d6efd5b122fbf3c0a9185; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uInhBIPUVl6HYlX1vhpwUVM",
        },
        query_params: {},
        query_params_desc: {
          typeV1: "",
          typeV2: "",
          rankType: "day",
          rankDate: "Date of 2 days ago: e.g. 2025-06-20",
          recentType: "",
          size: 20,
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
          size: 20,
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
        note: ''
      },
      topic_rank: {
        id: 'topic_rank',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '用以获得近期流行的话题/Tag等',
        name: 'topic_rank',
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
          request_id: "4a2951f5154c40ec83b98cfdfb56b354",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Cookie: "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=1a0c39a017507148997454957e006418bff5aa457d6efd5b122fbf3c0a9185; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uInhBIPUVl6HYlX1vhpwUVM",
        },
        query_params: {},
        query_params_desc: {
          type: "\u5168\u90E8",
          topicSecondType: "",
          dateType: 1,
          rankDate: "Date of 2 days ago: e.g. 2025-06-20",
          isBrandTopic: "0",
          sort: "interactiveCount",
          size: 20,
          start: 1,
        },
        query_params_example: {
          type: "\u5168\u90E8",
          topicSecondType: "",
          dateType: 1,
          rankDate: "2025-06-20",
          isBrandTopic: "0",
          sort: "interactiveCount",
          size: 20,
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
        note: ''
      },
      koc_search: {
        id: 'koc_search',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据关键字搜索红人的基本画像，包括其基础信息、内容特征、粉丝画像、商业指标等',
        name: 'koc_search',
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
          "request_id": "3a42c5ec6dc2494abe8d15b150a8ecf6",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": `sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; NR_MAIN_SOURCE_RECORD={"locationSearch":"?plat=4&id=8E24720DD90E4DE08FB0DAEA72FF3D11&qr=weixin%3A%2F%2Fwxpay%2Fbizpayurl%3Fpr%3DgluwX4Az3&cate=0&redirect_uri=https%3A%2F%2Fxh.newrank.cn%2Fuser%2Forder%2Flist","locationHref":"https://data.newrank.cn/wechatpay?plat=4&id=8E24720DD90E4DE08FB0DAEA72FF3D11&qr=weixin%3A%2F%2Fwxpay%2Fbizpayurl%3Fpr%3DgluwX4Az3&cate=0&redirect_uri=https%3A%2F%2Fxh.newrank.cn%2Fuser%2Forder%2Flist","referrer":"https://xh.newrank.cn/","source":"","keyword":"","firstReferrer":"https://xh.newrank.cn/","firstLocation":"https://data.newrank.cn/wechatpay?plat=4&id=8E24720DD90E4DE08FB0DAEA72FF3D11&qr=weixin%3A%2F%2Fwxpay%2Fbizpayurl%3Fpr%3DgluwX4Az3&cate=0&redirect_uri=https%3A%2F%2Fxh.newrank.cn%2Fuser%2Forder%2Flist"}; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uI1aultGNAH9uBZ7GPz53MI; acw_tc=1a0c39d417507208750697041e007a7ec564a9b789447118d9961e75422522`,
        },
        query_params: {},
        query_params_desc: {
          activeId: "B5F3D1C1BF084B508CEBED4543B5F3D1",
          baseReq: {
            "isMCN": "",
            "gender": "",
            "redUserLevelName": "",
            "newShowCityInfo": "",
            "newShowCityIpInfo": "",
            "userAttribute": [],
            "mostType": "",
            "identifySign": "",
            "follow": {
              "fixedRange": "",
              "customizeRange": ""
            },
            "lastCreateTime": ""
          },
          batchId: "",
          batchName: "",
          contentTags: [],
          custom: {must: [], should: [], mustNot: []},
          cycle: "30d",
          dataReq: {videoPrice: {fixedRange: "", customizeRange: ""}, picturePrice: {fixedRange: "", customizeRange: ""}},
          fansReq: {
            distribute: "0, or 1, or empty",
            province: "省级地域，如北京，须是北京，而不是北京市，只写一个",
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
          type: {first: "", second: []},
          xhsRedUserPgyReq: {pgyPersonaltags: []}
        },
        query_params_example: {
          activeId: "B5F3D1C1BF084B508CEBED4543B5F3D1",
          baseReq: {
            "isMCN": "",
            "gender": "",
            "redUserLevelName": "",
            "newShowCityInfo": "",
            "newShowCityIpInfo": "",
            "userAttribute": [],
            "mostType": "",
            "identifySign": "",
            "follow": {
              "fixedRange": "",
              "customizeRange": ""
            },
            "lastCreateTime": ""
          },
          batchId: "",
          batchName: "",
          contentTags: [],
          custom: {must: [], should: [], mustNot: []},
          cycle: "30d",
          dataReq: {videoPrice: {fixedRange: "", customizeRange: ""}, picturePrice: {fixedRange: "", customizeRange: ""}},
          fansReq: {
            distribute: "",
            province: "北京",
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
        note: ''
      },
      industry_rank: {
        id: 'industry_rank',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据领域/频道获取红人榜单，包括其基础信息、粉丝/点赞/收藏数量、指数等',
        name: 'industry_rank',
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
          "request_id": "958fea6ed54d4a218f3c28c2304bed42",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uIkX4Bpkd4DEVn8HV8b8XWZ; acw_tc=1a0c39d417507130523308239e005903636dc589f6231ed1d515f0bd7ee0fe",
        },
        query_params: {},
        query_params_desc: {
          dateType: "3",
          rankDate: "Date of the first day of last month: e.g. 2025-05-01",
          size: 20,
          start: 1,
          'subType.first': "Same as type",
          'subType.second': "",
          type: "Search keyword: 领域/频道, such as 美妆",
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
        note: ''
      },
      koc_image: {
        id: 'koc_image',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '根据ID获取KOC的详细画像，包括其账号概览、粉丝分析、笔记分析、投放分析、品牌推广、品类分析、直播分析等',
        name: 'koc_image',
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
          "request_id": "74970e50a2954727a62fae9302b5d795",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cookie": "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22nr_51qcmvw2q%22%2C%22first_id%22%3A%2219584847d74e3-083464dad8bd598-26011a51-960000-19584847d751430%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22baidu%22%2C%22%24latest_utm_medium%22%3A%22cpc%22%2C%22%24latest_utm_campaign%22%3A%22%E6%96%B0%E7%BA%A2SEM%22%2C%22%24latest_utm_term%22%3A%22%E6%96%B0%E7%BA%A2%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1ODQ4NDdkNzRlMy0wODM0NjRkYWQ4YmQ1OTgtMjYwMTFhNTEtOTYwMDAwLTE5NTg0ODQ3ZDc1MTQzMCIsIiRpZGVudGl0eV9sb2dpbl9pZCI6Im5yXzUxcWNtdncycSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%22nr_51qcmvw2q%22%7D%2C%22%24device_id%22%3A%22196c2a9c80ad59-0b34bec0dc40558-26011f51-960000-196c2a9c80b1567%22%7D; tfstk=gdjjwkjHsjcj5D-tCE2rVraQ6Ex_T8rEhA9OKOnqBnKA5c6dQ-YNgOd15QBI0Z8wDR119sTN1O2DBCCO1C74zkWcnhxTT1ZUYt21i13GchhNenvaSAxf2kWcnYHj6J78YAZ-Y2tv61LvyQpHwcnA6Fh8FdpZMVnA68wWQppxDdnvybpMChdO6he5eQv9XKC9XAZsNLVXNtwq1ive1-wACQitXg97sBBXJLvlVhLX9GASXOsWhEOdHMMXeOvR4gTezAPW29bPMLtQcXvfy9tvCG2K5CT1m391rSgVOsvOeU14QVv55OIHmHMTDTtXGeI1wvn59T6O8UszpkxXDIQwmOkQgTsfgtj5QA3Jcn7WRitLxjdNz9s6CGVgV66OKNL5fjsyGDRBL50sFem6FBy7FV0gFByrqNzQqJ8vEL-UF8gHjEpkFBy7FV0MkLvoz8wS-hf..; token=ED3E49C60ABD45F5BDD8084F377C2158; Hm_lvt_a19fd7224d30e3c8a6558dcb38c4beed=1748232589,1748616498,1750370567,1750633396; acw_tc=1a0c39a017507148997454957e006418bff5aa457d6efd5b122fbf3c0a9185; auth_n=9kCvQOR0mS5PMn1Nms/ogCnua4rl1L0Pw17pPUxB8uJwqljjZpgORQxo2uAJMyAz",
        },
        query_params: {},
        query_params_desc: {
          rid: "UserId of the account, e.g. 6204d8f30000000021022ff2"
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
        note: ''
      },
      koc_imitate: {
        id: 'koc_imitate',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '优秀内容对标，根据我的产品、业务和背景等搜索到合适的对标网红KOC；该操作能获得KOC列表和其内容列表两类数据',
        name: 'koc_imitate',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'koc_search',
        // The Second Request
        request2: 'get_note_list',
      },
      koc_evaluate: {
        id: 'koc_evaluate',
        backup: '',
        priority: 0,
        type: 'social-media',
        platform: 'rednote',
        description: '达人合作评估，根据给定的达人网红KOC账号信息，找到其详细画像，对其进行合作评估；该操作能获得KOC画像和其内容列表两类数据',
        name: 'koc_evaluate',
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
