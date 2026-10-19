// Set VERCEL environment flag before requiring the server module
process.env.VERCEL = process.env.VERCEL || "1";
const serverModule = require("../dist/server.js");
const app = serverModule.default || serverModule;

module.exports = app;
