import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// "chat-cache-file.txt"
export function appendToChatCache(content: string, filename: string, onError?: (err: Error) => void) {
    const filedir = path.join(process.cwd(), "files");
    if (!fs.existsSync(filedir)) {
        fs.mkdirSync(filedir, { recursive: true });
        console.log(`created: ${filedir}`);
    } else {
        console.log(`exist: ${filedir}`);
    }
    const filePath = path.join(
        process.cwd(), // /root/xdata3/data3-agent/files/111111_memory.txt
        "files",
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
    const filedir = path.join(process.cwd(), "files");
    if (!fs.existsSync(filedir)) {
        fs.mkdirSync(filedir, { recursive: true });
        console.log(`created: ${filedir}`);
    } else {
        console.log(`exist: ${filedir}`);
    }
    const filePath = path.join(
        process.cwd(),
        "files",
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
    const filedir = path.join(process.cwd(), "files");
    if (!fs.existsSync(filedir)) {
        fs.mkdirSync(filedir, { recursive: true });
        console.log(`created: ${filedir}`);
    } else {
        console.log(`exist: ${filedir}`);
    }
        const filePath = path.join(
        process.cwd(), // /root/xdata3/data3-agent/files/111111_memory.txt
        "files",
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

function getDynamicTail(taskId: string) {
    const textFilePaths = [];
    const excelFilePaths = [];
    for (let i = 1; i <= 10; i++) {
        const filenametxt = taskId + `_raw_data${i}.txt`;
        const filenamexlsx = taskId + `_raw_data${i}.xlsx`;

        // const filename = 'abc.pdf'; // Test: can also download pdf.
        const filePathtxt = path.join(
            process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
            "files",
            filenametxt
        );
        if (fs.existsSync(filePathtxt)) {
            //
            const url = `https://data3.site/media/files/${filenametxt}`;
            textFilePaths.push(url);
        }
        // const filename = 'abc.pdf'; // Test: can also download pdf.
        const filePathxlsx = path.join(
            process.cwd(), // /root/xdata3/data3-agent/data/Task-111111_report1.txt
            "files",
            filenamexlsx
        );
        if (fs.existsSync(filePathxlsx)) {
            //
            const url = `https://data3.site/media/files/${filenamexlsx}`;
            excelFilePaths.push(url);
        }
    }
    let dynamicTail = "";
    if (textFilePaths.length > 0 || excelFilePaths.length > 0) {
        dynamicTail += "\n数据下载:";

        if (textFilePaths.length > 0) {
            dynamicTail += "\n1. 文本数据（可粘贴至AI分析）:";
            dynamicTail += `\n${textFilePaths.join("\n")}`;
        }

        if (excelFilePaths.length > 0) {
            dynamicTail += "\n2. Excel数据（格式美观）:";
            dynamicTail += `\n${excelFilePaths.join("\n")}`;
        }

        dynamicTail += "\n（数据三天后过期）";
    }
    if (textFilePaths.length > 0 || excelFilePaths.length > 0) {
        return dynamicTail;
    }
    return "获取数据源失败，请稍后再尝试";
}
