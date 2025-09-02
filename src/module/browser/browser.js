const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const { success, _error } = require("../../shared/utils");
const {
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  USERAGENT,
  BROWSER_ARGS,
} = require("../../config/app.config");

async function init(profile, headless = true) {
  try {
    const sessionFolderPath = path.join(__dirname, profile, "session");

    if (!fs.existsSync(sessionFolderPath))
      fs.mkdirSync(sessionFolderPath, { recursive: true });

    const context = await chromium.launchPersistentContext(sessionFolderPath, {
      headless: headless,
      args: BROWSER_ARGS,
      userAgent: USERAGENT,
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    });

    success("Created context for: " + profile);
    return context;
  } catch (error) {
    _error("Error creating context:", error.message);
  }
}

module.exports = {
  init,
};
