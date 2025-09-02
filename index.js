const AnimePicturesDownloader = require("./src/module/anime-pictures_net/anime-pictures_downloader");
const config = require("./config.json");
const { DELAY_TIME, SKIP_ERRORS } = require("./src/config/app.config");
const { print, success, _error } = require("./src/shared/utils");
const { WELCOM_MESSAGE } = require("./src/shared/messages");

async function main() {
  console.log(WELCOM_MESSAGE);

  const downloader = new AnimePicturesDownloader();

  printConfiguration();

  try {
    await downloader.init();

    const allSearches = downloader.searchService.getAvailableSearchNames();

    if (allSearches.length === 0) {
      print(
        "No search found in configuration. Please add searches to config.json "
      );
      return;
    }

    await downloader.downloadMultipleSearches(allSearches, {
      // maxImages: 50,     // Uncomment to limit the number of images per search
      // maxPages: 3,       // Uncomment to limit the number of pages per search
      delay: DELAY_TIME, 
      skipErrors: SKIP_ERRORS, 
    });

    success("All configuration searches have been completed successfully!");
  } catch (error) {
    _error("Main:", error.message);
  } finally {
    await downloader.cleanup();
  }
}

function printConfiguration() {
  print("=== Configuration ===");
  print(`Download directory: ${config.app.downloadDir}`);
  print(`Database enabled: ${config.database.enabled ? "Yes" : "No"}`);
  print(`Skip downloaded: ${config.download.skipDownloaded ? "Yes" : "No"}`);
  print(`Delay between images: ${config.download.delay}ms`);
  print(`Skip errors: ${config.download.skipErrors ? "Yes" : "No"}`);

  const enabledSearches = config.searches;
  print(
    `Enabled searches: ${enabledSearches.length}/${config.searches.length}`
  );

  enabledSearches.forEach((search, index) => {
    const limits = [];
    if (search.maxImages) limits.push(`${search.maxImages} images`);
    if (search.maxPages) limits.push(`${search.maxPages} pages`);
    const limitText = limits.length ? ` (max: ${limits.join(", ")})` : "";
    print(`  ${index + 1}. ${search.name}${limitText}`);
  });

  print("==================\n");
}

process.on("SIGINT", () => {
  print("Received interrupt signal. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  print("Received terminate signal. Shutting down gracefully...");
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    _error(`Unhandled error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = main;
