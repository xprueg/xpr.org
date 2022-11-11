import crypto from "crypto";
import { SELECT, INSERT } from "./database.mjs";

export default new class User {
    async getFromCookie(cookie) {
        if (!cookie)
            return false;

        const session_id = cookie.match(/session_id=(?<sid>[^;]*)/)?.groups.sid;
        const user = await SELECT("*", { session_id });

        return user[0];
    }

    async getOauthUserWithSessionIdAndState() {
        const user =  {
            state: crypto.randomBytes(16).toString("hex"),
            session_id: crypto.randomBytes(16).toString("hex"),
        }

        await INSERT(user);
        return user;
    }

    async exists(login) {
        const user = await SELECT("login", { login });
        return user.length;
    }
}