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
      //'hot_words: 用以获得近期火热的热词等',
      //'hot_topics: 用以获得近期火热的话题/种类等',
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
      notes_search_0: {
        id: '',
        backup: 'notes_search_1',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
        filter: true,
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
      notes_search: {
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
          sort: 'Enum: Sort(default:general), general: 综合(Default), popularity_descending: 最热(Hot), time_descending: 最新(New)',
          noteType: 'Enum: Note type(default: 0), 0: 综合(General), 1: 视频筛选(Video), 2: 图文筛选(Normal)'
        },
        query_params_example: {
          keywords: 'dance',
          page: 1,
          sort: 'general',
          noteType: '0'
        },
        docs_link: 'https://docs.tikhub.io/268383320e0',
        filter: true,
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
      users_search: {
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
        filter: true,
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
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
        filter: false,
        flattener: '',
        limit: '',
        price: '',
        note: ''
      },
      notes_comment_by_next_page: {
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
        filter: false,
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
            'sub_comments': $map($item.sub_comments, function($sc) {
              {
                'id': $sc.id,
                'content': $sc.content,
                'like_count': $sc.like_count,
                'username': $sc.user.nickname,
                'userid': $sc.user.userid,
                'time': $sc.time,
                'ip_location': $sc.ip_location
              }
            })
          }
        })`,
        limit: '',
        price: '',
        note: ''
      },
      get_note_list: {
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
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
        filter: false,
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
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
        name: 'user_notes',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'notes_search',
        // The Second Request
        request2: 'notes_comment_by_next_page',
      },
      fetch_notes_and_comments_by_keyword: {
        id: '',
        backup: '',
        type: 'social-media',
        platform: 'rednote',
        description: '',
        name: 'user_notes',
        // Excute Data Dependency
        execute_depend: 'chain_loop', // ['chain', 'chain_loop']
        // The First Request
        request1: 'notes_search',
        // The Second Request
        request2: 'notes_comment_by_next_page',
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
