import { startCollection, waitForCollection, getCollectionData } from './brightApi';
import { saveToJson } from './utils';

export const data3Fetch = async (targetUrl: string) => {
    //return await fetch(targetUrl); // todo: data3Fetch

    console.log('Starting Bright Data collection workflow...');
    const collectionId = await startCollection(targetUrl, process.env.COLLECTOR_ID);
    if (!collectionId) {
        return;
    }

    if (!(await waitForCollection(collectionId))) {
        return;
    }

    const data = await getCollectionData(collectionId);
    if (data === null) {
        return;
    }

    await saveToJson(data);
};
