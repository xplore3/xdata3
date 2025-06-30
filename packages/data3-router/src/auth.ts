import { RequestHandler } from "express";

/**
 * Verify privy token
 * @param token
 * @returns
 */
export async function verifyToken(token: string) {
    try {
        //
    } catch (error) {
        console.log(`Token verification failed with error ${error}.`);
    }
}

/**
 * express middleware to parse privy token from header
 * @param req
 * @param res
 * @param next
 */
export const parseToken = async (req, res, next) => {
    const tokenHeader = req.headers.authorization?.split(" ");
    if (tokenHeader && tokenHeader.length > 1 && tokenHeader[0] === "Bearer") {
        const token = tokenHeader[1];
        res.locals.user = await verifyToken(token);
    }
    next();
};

/**
 * express middleware to require auth
 * @param req
 * @param res
 * @param next
 */
export const requireAuth: RequestHandler = (req, res, next) => {
    const user = res.locals.user;
    if (!user) {
        res.status(401).json({ error: "Token not provided" });
    } else {
        next();
    }
};

/**
 * Express Middleware for Exception Handler
 * @param req
 * @param res
 * @param next
 */
export const exceptionHandler = async (req, res, next) => {
    try {
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal system error." });
        res.end();
    }
};
