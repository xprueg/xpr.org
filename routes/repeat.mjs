import https from "https";
import express from "express";
import body_parser from "body-parser";
import { GET, POST } from "../fetch.mjs";

const router = express.Router();

const future = new Date("3456-02-01T00:00");

function getHeaders(access_token) {
    return {
        "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION, // also in js
        "User-Agent": "xprueg",
        Accept: "application/vnd.github+json",
        Authorization: access_token,
    };
}

function getCookieValFrom(req, key) {
    const regex = new RegExp(`${key}=(?<${key}>[^;]*)`);
    const val = req.headers.cookie?.match(regex)?.groups[key];

    if (val)
        return decodeURIComponent(val);
    return undefined;
}

function fetchAccessToken(req, res, next) {
    const access_token = getCookieValFrom(req, "token");
    if (access_token === undefined)
        return res.status(500).send("NO_ACCESS_TOKEN").end();

    req.access_token = access_token;
    next();
}

router.post("/api/save", fetchAccessToken, body_parser.json(), async (req, res) => {
    let gist_id = getCookieValFrom(req, "gist_id");
    if (gist_id === undefined)
        return res.status(500).send("NO_GIST_ID").end();

    const { status, body } = await POST(`api.github.com/gists/${gist_id}`, {
        method: "PATCH",
        headers: getHeaders(req.access_token),
        body: { files: req.body },
    });

    res.status(status).json(body).end();
});

async function getGistId(access_token) {
    const gists = await GET("api.github.com/gists", {
        headers: getHeaders(access_token),
    });

    for (const gist of gists)
        if (gist.description === "xpr.org/repeat")
            return gist.id;

    return false;
}

router.get("/api/get_gist", fetchAccessToken, async (req, res) => {
    let gist_id = getCookieValFrom(req, "gist_id");
    if (gist_id === undefined) {
        gist_id = await getGistId(req.access_token);
        if (!gist_id)
            return res.status(500).json("NO_GIST_FOUND").end();
    }

    return new Promise((resolve, reject) => {
        const api_req = https.request({
            method: "GET",
            hostname: "api.github.com",
            path: `/gists/${gist_id}`,
            headers: getHeaders(req.access_token),
        }, api_res => {
            res.writeHead(api_res.statusCode);
            api_res.pipe(res);
        })

        api_req.end();
    });
});

export default router;