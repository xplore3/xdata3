import { settings } from '@data3os/agentcontext';
import axios from 'axios';

async function chatWithDeepSeek(prompt) {
    //const DEEPSEEK_API_KEY = 'sk-b07cb6936f3b40289ef7e0090266a69b';
    const DEEPSEEK_API_KEY = settings.DEEPSEEK_API_KEY;
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: settings.MEDIUM_DEEPSEEK_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw error;
    }
}

export async function getAIFilter(userQuestion: string) {
    try {
        const prompt = `你是一个严肃、认真的数据工程师，请你先不用关注用户问题，只针对下面字段结合用户的问题填写下面的值:
        [用户问题：${userQuestion}]
        [重要字段:
        min_collected count未提及时默认0，
        min_shared_count 未提及时默认0,
        min_liked_count 未提及时默认0,
        min_comments count 未提及时默认0,
        max_collected_count 未提及时默认20000,
        max_shared_count 未提及时默认20000,
        max_liked_count 未提及时默认20000,
        max_comments_count 未提及时默认20000,
        ]
请你直接返回 JSON 结果，不要返回其他内容，不要附加解释， JSON 结构如下：
 {
     "min_collected_count": 0,
     "min_shared_count": 0,
     "min_liked_count": 0,
     "min_comments_count": 0,
     "max_collected_count": 20000,
     "max_shared_count": 20000,
     "max_liked_count": 20000,
     "max_comments_count": 20000
 }
 `;
        const filterStr = await chatWithDeepSeek(prompt);
        console.log(`\n------------------AI-Filter-Begin---------------------\nprompt:${prompt}\nfilterStr:${filterStr}\n------------------AI-Filter--End--------------------`);

        return filterStr;
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        return "";
    }
}

// chatWithDeepSeek(userquestionStr)
//   .then(response => console.log(response))
//   .catch(error => console.error(error));