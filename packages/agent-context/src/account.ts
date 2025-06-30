import type {
    IAgentRuntime,
    Account,
    Actor,
    Content,
    Memory,
    UUID,
} from "./types.ts";
import { stringToUuid } from "./uuid.ts";

/**
 * Get User Account UserId by Openid.
 */
export function getUserIdByOpenId({
    runtime,
    openid,
}: {
    runtime: IAgentRuntime;
    openid: string;
}) {
    const userId = stringToUuid(openid);
    return userId;
}

/**
 * Get User Account by ExternalUserId.
 */
export async function getAccountByExternalUserId({
    runtime,
    external_userid,
}: {
    runtime: IAgentRuntime;
    external_userid: string;
}) {
    try {
        return await runtime.databaseAdapter.getAccountByExternalUserId(external_userid);
    }
    catch (error) {
        console.error("Error fetching account by external user ID:", error);
        return null;
    }
}

/**
 * Create Account by ExternalUserInfo.
 */
export async function createAccountByExternalData({
    runtime,
    openid,
    external_userid,
}: {
    runtime: IAgentRuntime;
    openid: string;
    external_userid: string;
}) {
    try {
        if (!external_userid) {
            throw new Error("ExternalUserId are required to create an account.");
        }
        if (!openid) {
            openid = external_userid; // Use external_userid as openid if openid is not provided
        }
        else {
            // Check if the account already exists
            const existingAccount = await runtime.databaseAdapter.getAccountByOpenId(openid);
            if (existingAccount) {
                return existingAccount; // Return existing account if found
            }
            else {
                // Create a new account if it doesn't exist
            }
        }

        const existingAccount = await runtime.databaseAdapter.getAccountByExternalUserId(external_userid);
        if (existingAccount) {
            if (existingAccount.openid === openid) {
                return existingAccount; // Return existing account if found
            }
            else {
                // Update the existing account with the new openid
                existingAccount.openid = openid;
                return await runtime.databaseAdapter.updateAccount(existingAccount);
            }
        }
        
        const account: Account = {
            id: stringToUuid(openid),
            name: "",
            username: "",
            email: "",
            avatarUrl: "",
            openid: openid,
            external_userid: external_userid,
            details: {},
        };
        await runtime.databaseAdapter.createAccount(account);
    }
    catch (error) {
        console.error("Error create account by external data:", error);
        return null;
    }
}

/**
 * Update account by OpenId & External UserId.
 * This function is used to update the account information based on OpenId and External UserId.
 * @param account - Account object containing the account details to be updated.
 * @returns string
 */
export async function updateAccount({
    runtime, account
}: {
    runtime: IAgentRuntime;
    account: Account
}) {
    try {
        return await runtime.databaseAdapter.updateAccount(account);
    }
    catch (error) {
        console.error("Error updating account:", error);
        return null;
    }
}
