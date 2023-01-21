import http, { IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import busboy from "busboy";

const server = http.createServer();
const PORT = 3000;

const extensions: Record<string, string | undefined> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".js": "text/javascript",
    ".css": "text/css",
}

async function getIndex(req: IncomingMessage, res: ServerResponse) {
    const index = await readFile("./index.html");
    res.writeHead(200, {
        "Content-Type": "text/html"
    });
    res.end(index);
}

async function getList(req: IncomingMessage, res: ServerResponse) {
    const dir = await readdir("./public");
    const result = [];
    for (const file of dir) {
        const ext = path.extname(file);
        if (ext === ".jpg" || ext === ".png") {
            result.push("/public/" + file);
        }
    }
    res.writeHead(200, {
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify(result));
}

async function getStaticFile(req: IncomingMessage, res: ServerResponse) {
    if (!req.url) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
    }
    const filepath = path.resolve(path.join(".", req.url));
    const type = extensions[path.extname(filepath)];
    if (!type) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
    }
    const content = await readFile(filepath);
    res.writeHead(200, {
        "Content-Type": type,
    });
    res.end(content);
}

async function uploadFile(req: IncomingMessage, res: ServerResponse) {
    const bb = busboy({ headers: req.headers });
    bb.on("file", (name, filestream, info) => {
        const uuid = crypto.randomUUID();
        const ext = path.extname(info.filename);
        filestream.pipe(createWriteStream(path.join(".", "public", uuid + ext)));
    });
    req.pipe(bb);
    req.on("end", () => {
        res.writeHead(302, {
            "Location": "/"
        });
        res.end("Uploaded!");
    });
}

server.on("request", async (req, res) => {
    try {
        if (req.url === "/" && req.method === "GET") {
            await getIndex(req, res);
        } else if (req.url?.startsWith("/public") && req.method === "GET") {
            await getStaticFile(req, res);
        } else if (req.url === "/list" && req.method === "GET") {
            await getList(req, res);
        } else if (req.url === "/" && req.method === "POST") {
            await uploadFile(req, res);
        } else {
            res.statusCode = 404;
            res.end("Not Found");
        }
    } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end(e);
    }
});

server.listen(PORT, () => {
    console.log('Listen on ' + PORT);
});