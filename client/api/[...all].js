// Catch-all Vercel Serverless Function for all /api/* routes
process.env.VERCEL = process.env.VERCEL || "1";

let serverModule;
try {
  serverModule = require("../server.js");
} catch {
  try {
    serverModule = require("../dist/server.js");
  } catch {
    serverModule = require("./server.js");
  }
}

const app = serverModule.default || serverModule;

module.exports = app;
