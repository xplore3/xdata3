// brightApi.ts

export async function startCollection(targetUrl: string, collectorId: string): Promise<string | null> {
    const url = `${process.env.BRIGHT_BASE_URL}/dca/trigger?collector=${collectorId}`;
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.BRIGHT_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: `[{"url": "${targetUrl}"}]`
    };

    try {
        const response = await fetch(url, options);
        const collectionId = response.data?.collection_id;

        if (!collectionId) {
            console.error('No collection_id in response.');
            return null;
        }

        console.log(`Started collection: ${collectionId}`);
        return collectionId;
    } catch (error) {
        console.error(`Failed to start collection: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

export async function waitForCollection(collectionId: string, timeout: number = 600, interval: number = 10): Promise<boolean> {
    const url = `${process.env.BRIGHT_BASE_URL}/dca/dataset?id=${collectionId}&format=json`;
    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.BRIGHT_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    const endTime = Date.now() + timeout * 1000;

    while (Date.now() < endTime) {
        try {
            const response = await fetch(url, options);

            if (response.status === 404) {
                console.log('Dataset not ready yet (404), sleeping...');
                await sleep(interval);
                continue;
            }

            const data = response.data;

            if (Array.isArray(data) && data.length > 0) {
                console.log(`Dataset ready with ${data.length} items.`);
                return true;
            }

            if (typeof data === 'object' && data !== null) {
                const collection = data.collection;
                if (Array.isArray(collection) && collection.length > 0) {
                    console.log(`Dataset ready with ${collection.length} items.`);
                    return true;
                }
            }

            console.log('Data not ready yet, waiting...');
            await sleep(interval);
        } catch (error) {
            console.error(`Error checking collection status: ${error instanceof Error ? error.message : String(error)}`);
            await sleep(interval);
        }
    }

    console.error('Timeout waiting for collection to complete.');
    return false;
}

export async function getCollectionData(collectionId: string): Promise<any | null> {
    const url = `${process.env.BRIGHT_BASE_URL}/dca/dataset?id=${collectionId}&format=json`;
    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.BRIGHT_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(url, options);
        const data = response.data;

        if (Array.isArray(data)) {
            console.log(`Fetched dataset with ${data.length} items.`);
            return data;
        }

        if (typeof data === 'object' && data !== null) {
            const collection = data.collection;
            if (collection) {
                console.log(`Fetched collection with ${collection.length} items.`);
                return collection;
            }
        }

        console.error('Unexpected data format received.');
        return null;
    } catch (error) {
        console.error(`Failed to get collection data: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

function sleep(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
