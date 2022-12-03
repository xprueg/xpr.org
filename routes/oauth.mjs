import express from "express";
import crypto from "crypto";
import { GET, POST } from "../fetch.mjs";

const router = express.Router();

const epoch = new Date(0);
const future = new Date("3456-02-01T00:00");
// TODO Send new github api version header
router.get("/github/:project", async (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    const github_auth_url = new URL(`https://github.com/login/oauth/authorize?${
        new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: `${process.env.DOMAIN}/oauth/github/code/${req.params.project}`,
            scope: "gist",
            state,
        })
    }`);

    res.cookie("state", state, { expires: future, secure: true, httpOnly: true });
    res.redirect(github_auth_url);
});

async function exchangeCodeForAccessToken(code) {
    const res = await POST("github.com/login/oauth/access_token", {
        headers: {
            Accept: "application/vnd.github+json",
        },
        body: {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
        },
    });

    return `${res.body.token_type} ${res.body.access_token}`;
}

async function fetchGithubUser(access_token) {
    const github_user = await GET("api.github.com/user", {
        headers: {
            "User-Agent": "xprueg",
            Accept: "application/vnd.github+json",
            Authorization: access_token,
        },
    });

    return github_user;
}

router.get("/github/code/:project", async (req, res) => {
    const { project } = req.params;
    const { state, code } = req.query;
    const user_state = req.headers.cookie.match(/state=(?<state>[^;]*)/)?.groups.state;

    if (state === user_state) {
        const access_token = await exchangeCodeForAccessToken(code);
        const { login, avatar_url } = await fetchGithubUser(access_token);

        res.cookie("access_token", access_token, { expires: future, secure: true, httpOnly: true });
        res.cookie("login", login, { expires: future, secure: true, httpOnly: false });
        res.cookie("avatar", avatar_url, { expires: future, secure: true, httpOnly: false  });
    }

    res.cookie("state", null, { expires: epoch, secure: true, httpOnly: true });
    res.redirect(`/${project}/`);
});

router.get("/github/logout/:project", async (req, res) => {
    const { project } = req.params;

    req.headers.cookie.split("; ").forEach(cookie => {
        const [name, _] = cookie.split("=");
        res.cookie(name, null, { expires: epoch });
    });

    res.status(200).redirect(`/${project}/`);
});

export default router;