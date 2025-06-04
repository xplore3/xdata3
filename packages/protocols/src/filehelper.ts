import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// "chat-cache-file.txt"
export function appendToChatCache(content: string, filename: string, onError?: (err: Error) => void) {
    const filePath = path.join(
        process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
        "data",
        filename
    );
    // file: fs.createReadStream("chat-cache-file_" + taskId + ".txt"),    
    fs.appendFile(filePath, content, (err) => {
        if (err) {
            onError?.(err) || console.error("Failed to write file:", err);
            return;
        }
        console.log("Content successfully appended to file: ", filePath);
        console.log("Content: \n", content.slice(0, 200));
    });
}

export function readCacheFile(filename: string): string {
    const filePath = path.join(
        process.cwd(),
        "data",
        filename
    );
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error("Failed to read file:", err);
        return null;
    }
}

export function updateCacheText(content: string, filename: string, onError?: (err: Error) => void) {
        const filePath = path.join(
        process.cwd(), // /root/xdata3/data3-agent/data/111111_memory.txt
        "data",
        filename
    );
    // file: taskId + "_memory.txt"
    fs.writeFile(filePath, content, (err) => {
        if (err) {
            onError?.(err) || console.error("Failed to write file:", err);
            return;
        }
        console.log("Content successfully overwritten to file: ", filePath);
        console.log(`======================== ${filename} begin ==================== \n ${content.slice(0, 200)}\n ... \n===================== ${filename} end =======================`);
    });
}