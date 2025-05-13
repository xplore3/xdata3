import OpenAI from 'openai';
import fs from 'fs';
import { settings } from '@data3os/agentcontext';
import { fileURLToPath } from 'url';
import path from 'path';

const client = new OpenAI({
    apiKey: settings.MOONSHOT_API_KEY,
    baseURL: settings.MOONSHOT_API_URL,
});
// "chat-cache-file.txt"

export async function generateTextWithFile(filename: string, userQuestion: string): Promise<string> {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filePath = path.join(__dirname, filename);
        const file_object = await client.files.create({
            file: fs.createReadStream(filePath),
            purpose: "file-extract"
        });
        console.log("generateTextWithFile filename: " + filename);

        const file_content = await (await client.files.content(file_object.id)).text();
                console.log("generateTextWithFile file_content: " + file_content);

        const messages = [
            {
                "role": "system",
                "content": "You are Kimi, the AI ​​assistant powered by Moonshot AI...",
            },
            {
                "role": "system",
                "content": `Combine this file ${filename} and answer the following user's question. The following is a bit long and includes the reasoning process` + file_content,
            },
            {"role": "user", "content": userQuestion},
        ];

        const completion = await client.chat.completions.create({
            model: settings.LARGE_MOONSHOT_MODEL,
            messages: messages,
            temperature: 0.3
        });

        return completion.choices[0].message.content;
    } catch (error) {
        throw new Error(`chat with file, File processing failed: ${error.message}`);
    }
}