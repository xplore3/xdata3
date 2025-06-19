import axios, { AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

global.myGlobalProxyUsed = false;
const proxyAgent = new SocksProxyAgent('socks5://43.138.5.48:7890');

function createRequestConfig(config: AxiosRequestConfig): AxiosRequestConfig {
    return global.myGlobalProxyUsed 
        ? { ...config, httpAgent: proxyAgent, httpsAgent: proxyAgent }
        : config;
}

async function tryRequest(config: AxiosRequestConfig) {
    try {
        return await axios.request(config);
    } catch (error) {
        console.log(`Request failed for config: ${JSON.stringify(config)}`);
        console.error('Error details:', error instanceof Error ? error.stack : error);
        global.myGlobalProxyUsed = !global.myGlobalProxyUsed; // Toggle proxy state
        throw error; // Re-throw to allow retry
    }
}

async function axios_request(config: AxiosRequestConfig) {
    console.log(`Initial proxy state: ${global.myGlobalProxyUsed}`);
    
    // First attempt
    try {
        return await tryRequest(createRequestConfig(config));
    } catch (firstError) {
        console.log('First attempt failed, retrying with alternate proxy...');
        
        // Second attempt with toggled proxy state
        try {
            return await tryRequest(createRequestConfig(config));
        } catch (secondError) {
            console.error('Both proxy attempts failed');
            throw new Error(`Request failed after 2 attempts: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`);
        }
    }
}
export { axios_request };