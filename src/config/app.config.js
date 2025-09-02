require("dotenv").config();

const config = require("../../config.json");

module.exports = {
  HEADLESS: config.browser.headless || true, // Default to true if not specified
  VIEWPORT_WIDTH: config.browser.viewport.width || 1280,
  VIEWPORT_HEIGHT: config.browser.viewport.height || 720,
  USERAGENT:
    config.browser.userAgent ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  BROWSER_ARGS: config.browser.args || [],
  BROWSER_TIMEOUT: config.browser.timeout || 30000, // Browser timeout (30 seconds)

  SEARCH_LIST: config.searches || [],
  DOWNLOAD_DIR: config.app.downloadDir || "downloads",
  GLOBAL_SKIP_DOWNLOADED: config.download.skipDownloaded || false,
  USE_DATABASE: config.download.useDatabase || false,
  SKIP_ERRORS: config.download.skipErrors || true, // Continue on errors

  DELAY_TIME: config.download.delayTime || 2000, // Delay between images (2 seconds)
  DOWNLOAD_BASE_URL:
    config.api.downloadBaseUrl ||
    "https://api.anime-pictures.net/pictures/download_image",
  BASE_URL: config.api.baseUrl || "https://api.anime-pictures.net/api/v3/posts",
};
