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
        // throw error;
        return `[]`;
    }
}

export {
    chatWithDeepSeek
}