// Vercel Serverless Function for GET /api/health
process.env.VERCEL = process.env.VERCEL || "1";

let serverModule;
try {
  serverModule = require("../dist/server.js");
} catch {
  try {
    serverModule = require("./dist/server.js");
  } catch {
    serverModule = require("../server.js");
  }
}

const app = serverModule.default || serverModule;

module.exports = app;

