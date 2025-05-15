// utils.ts
import fs from 'fs';
import path from 'path';

export async function saveToJson(data: any, outputDir: string = process.env.OUTPUT_DIR): Promise<string | null> {
    try {
        await fs.promises.mkdir(outputDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
        const filename = path.join(outputDir, `collection_data_${timestamp}.json`);

        await fs.promises.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Saved data to ${filename}`);
        return filename;
    } catch (error) {
        console.error(`Failed to save data: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
