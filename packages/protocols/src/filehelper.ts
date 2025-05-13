import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// "chat-cache-file.txt"
export function appendToChatCache(content: string, filename: string, onError?: (err: Error) => void) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, filename);
    // file: fs.createReadStream("chat-cache-file_" + taskId + ".txt"),    
    fs.appendFile(filePath, content, (err) => {
        if (err) {
            onError?.(err) || console.error("Failed to write file:", err);
            return;
        }
        console.log("Content successfully appended to file");
    });
}