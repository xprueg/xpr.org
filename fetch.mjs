import https from "https";

export function POST(url, opts) {
    const headers = opts.headers || {};
    const { hostname, pathname: path } = new URL(`https://${url}`);

    let body = opts.body;
    if (typeof opts.body === "object")
        body = JSON.stringify(body);

    const method = opts.method || "POST";
console.info(body);
    console.info(`POST ${url}`);

    if (body.length)
        Object.assign(headers, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
        });

    return new Promise((resolve, reject) => {
        const options = { method, hostname, path, headers };
        console.info(options);
        const req = https.request(options, res => {
            console.log('statusCode:', res.statusCode);

            let data = String();
            res.on("data", chunk => { data += chunk });
            res.on("end", () => { resolve(JSON.parse(data)) });
        });

        req.write(body);
        req.end();
    });
}

export function GET(url, opts) {
    const headers = opts.headers || {};
    const { hostname, pathname: path } = new URL(`https://${url}`);
    const method = opts.method || "GET";

    console.info(`GET ${url}`);

    return new Promise((resolve, reject) => {
        const options = { method, hostname, path, headers };

        const req = https.request(options, res => {
            let data = String();
            res.on("data", chunk => { data += chunk });
            res.on("end", () => { resolve(JSON.parse(data)) });
        });

        req.end();
    });
}