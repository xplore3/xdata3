import OpenAI from 'openai';
import fs from 'fs';
import { settings } from '@data3os/agentcontext';

const client = new OpenAI({
    apiKey: settings.MOONSHOT_API_KEY,
    baseURL: settings.MOONSHOT_API_URL,
});

export async function generateTextWithFile(filePath: string, userQuestion: string): Promise<string> {
    try {
        const file_object = await client.files.create({
            file: fs.createReadStream(filePath),
            purpose: "file-extract"
        });

        const file_content = await (await client.files.content(file_object.id)).text();

        const messages = [
            {
                "role": "system",
                "content": "You are Kimi, the AI ​​assistant powered by Moonshot AI...",
            },
            {
                "role": "system",
                "content": file_content,
            },
            {"role": "user", "content": userQuestion},
        ];

        const completion = await client.chat.completions.create({
            model: "moonshot-v1-128k",
            messages: messages,
            temperature: 0.3
        });

        return completion.choices[0].message.content;
    } catch (error) {
        throw new Error(`chat with file, File processing failed: ${error.message}`);
    }
}