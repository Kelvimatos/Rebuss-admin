// Catch-all Vercel Serverless Function for all /api/* routes
process.env.VERCEL = process.env.VERCEL || "1";
const serverModule = require("../dist/server.js");
const app = serverModule.default || serverModule;

module.exports = app;

