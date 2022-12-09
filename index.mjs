import fs from "fs";
import https from "https";
import express from "express";
import enforce from "express-sslify";
import helmet from "helmet";
import oauthRouther from "./routes/oauth.mjs";
import repeatRouter from "./routes/repeat.mjs";

const app = express();

app.set("trust proxy", 1);
app.use(enforce.HTTPS({ trustProtoHeader: true }));

app.use(
    helmet(),
    helmet.crossOriginEmbedderPolicy({ policy: "credentialless" }),
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https://rsms.me", "https://gist.githubusercontent.com", "https://gist.github.com", "https://api.github.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://rsms.me"],
            imgSrc: ["'self'", "https://avatars.githubusercontent.com"],
            fontSrc: ["'self'", "https://rsms.me"],
            baseUri: ["'self'"],
        },
    }),
);

app.use("/", express.static("static"));
app.use(["/fonts"],
    (req, res, next) => {
        const origin = req.get("referer") ?? req.get("origin");
        const is_valid_origin = origin.startsWith(process.env.DOMAIN) ||
                                origin.startsWith(process.env.LOCAL_IP);
        if (origin === undefined || !is_valid_origin)
            return res.status(403).end();

        res.setHeader("Access-Control-Allow-Origin", process.env.DOMAIN);
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("Vary", "Origin");
        next();
    },
    express.static("fonts"),
);
app.use("/repeat", repeatRouter);
app.use("/oauth", oauthRouther);

app.get("*", (req, res) => {
    res.status(404).send("~").end();
});

if (process.env.NODE_ENV === "production") {
    app.listen(process.env.PORT);
} else {
    https.createServer({
        key: fs.readFileSync("certs/localhost.key"),
        cert: fs.readFileSync("certs/localhost.crt"),
    }, app).listen(process.env.PORT);
}