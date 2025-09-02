const path = require("path");

const AnimePicturesApi = require("./anime-pictures_api");
const SearchService = require("../../service/search_service");
const browser = require("../browser/browser");
const { Downloaded_Image } = require("../teapot/models/index");
const sequelize = require("../teapot/sqlite/sqlite_db");

const { sleep, print, success, _error } = require("../../shared/utils");

const {
  SEARCH_LIST,
  USE_DATABASE,
  GLOBAL_SKIP_DOWNLOADED,
  HEADLESS,
  DOWNLOAD_BASE_URL,
} = require("../../config/app.config");

class AnimePicturesDownloader {
  constructor() {
    this.context = null;
    this.api = null;
    this.searchService = null;
    this.useDatabase = USE_DATABASE;
    this.globalSkipDownloaded = GLOBAL_SKIP_DOWNLOADED;
  }

  async init() {
    try {
      print("Initializing browser...");
      this.context = await browser.init("default", HEADLESS);

      if (this.useDatabase) {
        print("Initializing database...");
        await sequelize.authenticate();
        await sequelize.sync();
        success("Database ready");
      }

      this.api = new AnimePicturesApi(this.context);

      this.searchService = new SearchService({ searches: SEARCH_LIST });

      success("Initialization completed successfully");
    } catch (error) {
      _error("Initialization error: " + error.message);
      throw error;
    }
  }

  /**
   * Виконує завантаження за назвою пошуку
   * @param {string} searchName - Назва пошуку
   * @param {Object} options - Додаткові налаштування
   */
  async downloadBySearchName(searchName, options = {}) {
    try {
      print(`Search execution: "${searchName}"`);

      const searchConfig = this.searchService.getSearchByName(searchName);
      if (!searchConfig) {
        throw new Error(`Search "${searchName}" not found in configuration`);
      }

      this.api.setSearchFolder(searchConfig.name);

      const searchUrl = this.searchService.executeSearch(searchName);
      print(`Search URL: ${searchUrl}`);

      await this.downloadImagesAllPages(searchUrl, options, searchConfig.name);
    } catch (error) {
      _error("Search error: " + error.message);
      throw error;
    }
  }

  async isImageDownloaded(imageId, searchName) {
    if (!this.useDatabase) return false;

    try {
      const existingImage = await Downloaded_Image.findOne({
        where: {
          imageId: imageId.toString(),
          searchName: searchName,
        },
      });
      return existingImage !== null;
    } catch (error) {
      _error("Database verification error: " + error.message);
      return false;
    }
  }

  async markImageAsDownloaded(
    imageData,
    filePath,
    searchName,
    status = "downloaded"
  ) {
    if (!this.useDatabase) return;

    try {
      await Downloaded_Image.create({
        imageId: imageData.post.id.toString(),
        searchName: searchName,
        fileName: path.basename(filePath),
        filePath: filePath,
        fileSize: imageData.post.size,
        downloadUrl: `${DOWNLOAD_BASE_URL}/${imageData.file_url}`,
        md5Hash: imageData.post.md5,
        width: imageData.post.width,
        height: imageData.post.height,
        status: status,
      });
      print(`Image ${imageData.post.id} added to database`);
    } catch (error) {
      _error("Database insertion error: " + error.message);
    }
  }

  /**
   * Завантаження зображень з усіх сторінок
   * @param {string} baseSearchUrl - Базовий URL для пошуку
   * @param {Object} options - Налаштування
   * @param {string} searchName - Назва пошуку для папки
   */
  async downloadImagesAllPages(
    baseSearchUrl,
    options = {},
    searchName = "default"
  ) {
    const { maxImages, delay, skipErrors, maxPages } = options;

    try {
      print(`Obtaining information about the number of pages...`);

      const firstPageData = await this.api.getImagesList(baseSearchUrl);

      if (!firstPageData?.posts?.length) {
        _error("No images found");
        return;
      }

      const totalPages = firstPageData.max_pages || 1;
      const pagesToProcess = maxPages
        ? Math.min(maxPages, totalPages)
        : totalPages;

      print(`${firstPageData.posts_count} images found on ${totalPages} pages`);
      print(`${pagesToProcess} pages will be processed`);

      let totalSuccessCount = 0;
      let totalErrorCount = 0;
      let totalSkippedCount = 0;
      let totalProcessedImages = 0;

      for (let page = 0; page < pagesToProcess; page++) {
        print(`Processing page ${page + 1}/${pagesToProcess}`);

        try {
          const pageUrl = this.updateUrlPage(baseSearchUrl, page);
          print(`Page URL: ${pageUrl}`);

          const pageData =
            page === 0 ? firstPageData : await this.api.getImagesList(pageUrl);

          if (!pageData?.posts?.length) {
            print(`There are no images on page ${page + 1}`);
            continue;
          }

          let postsToProcess = pageData.posts;
          if (
            maxImages &&
            totalProcessedImages + postsToProcess.length > maxImages
          ) {
            const remaining = maxImages - totalProcessedImages;
            postsToProcess = postsToProcess.slice(0, remaining);
          }

          print(
            `${pageData.posts.length} images found on the page, ${postsToProcess.length} will be processed`
          );

          const { successCount, errorCount, skippedCount } =
            await this.downloadImagesFromPage(
              postsToProcess,
              page + 1,
              pagesToProcess,
              totalProcessedImages,
              delay,
              skipErrors,
              searchName
            );

          totalSuccessCount += successCount;
          totalErrorCount += errorCount;
          totalSkippedCount += skippedCount;
          totalProcessedImages += postsToProcess.length;

          if (maxImages && totalProcessedImages >= maxImages) {
            print(`Image limit reached (${maxImages})`);
            break;
          }

          if (page < pagesToProcess - 1) {
            print(`Delay between pages (${delay * 2}ms)...`);
            await sleep(delay * 2);
          }
        } catch (pageError) {
          totalErrorCount++;
          _error(`Error processing page ${page + 1}:`, pageError.message);

          if (!skipErrors) {
            throw pageError;
          }
        }
      }

      success(`Download completed!`);
      success(`┌ Statistics:`);
      success(`|   • Processed pages: ${Math.min(pagesToProcess, page + 1)}`);
      success(`|   • Total images: ${totalProcessedImages}`);
      success(`|   • Successfully downloaded: ${totalSuccessCount}`);
      success(`|   • Skipped: ${totalSkippedCount}`);
      success(`└   • Errors: ${totalErrorCount}`);
    } catch (error) {
      _error("Critical error occurred during download:", error.message);
      throw error;
    }
  }

  async downloadImagesFromPage(
    posts,
    currentPage,
    totalPages,
    startIndex,
    delay,
    skipErrors,
    searchName
  ) {
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < posts.length; i++) {
      const picture = posts[i];
      const globalIndex = startIndex + i + 1;

      try {
        print(
          `[Page ${currentPage}/${totalPages}] [${i + 1}/${
            posts.length
          }] [Total: ${globalIndex}] Processing image ${picture.id}...`
        );

        const pictureDetails = await this.api.getImageDetails(
          `https://api.anime-pictures.net/api/v3/posts/${picture.id}?extra=similar_pictures&lang=en`
        );

        print("Fetched image details");

        const shouldSkipDownloaded = this.getSkipDownloadedSetting(searchName);
        if (
          shouldSkipDownloaded &&
          (await this.isImageDownloaded(picture.id, searchName))
        ) {
          print(`Image ${picture.id} is already downloaded, skipping`);
          skippedCount++;
          continue;
        }

        await sleep(delay);

        const imageDownloadUrl = `https://api.anime-pictures.net/pictures/download_image/${pictureDetails.file_url}`;
        print(`Download URL: ${imageDownloadUrl}`);

        const filePath = await this.api.downloadImage(
          imageDownloadUrl,
          picture.id
        );

        await this.markImageAsDownloaded(pictureDetails, filePath, searchName);

        successCount++;
        success(`Image ${picture.id} downloaded successfully`);
      } catch (error) {
        errorCount++;
        _error(`Error processing image ${picture.id}: ` + error.message);

        if (!skipErrors) {
          throw error;
        }
      }

      if (i < posts.length - 1) {
        print(`Waiting ${delay}ms...`);
        await sleep(delay);
      }
    }

    return { successCount, errorCount, skippedCount };
  }

  getSkipDownloadedSetting(searchName) {
    const searchConfig = this.searchService.getSearchByName(searchName);
    return searchConfig?.skipDownloaded ?? this.globalSkipDownloaded;
  }

  updateUrlPage(url, page) {
    const urlObj = new URL(url);
    urlObj.searchParams.set("page", page.toString());
    return urlObj.toString();
  }

  /**
   * Виконує кілька пошуків послідовно
   * @param {Array} searchNames - Масив назв пошуків
   * @param {Object} options - Налаштування завантаження
   */
  async downloadMultipleSearches(searchNames, options = {}) {
    print(`Start loading: ${searchNames.length} searches...`);

    for (let i = 0; i < searchNames.length; i++) {
      const searchName = searchNames[i];
      print(`Search ${i + 1}/${searchNames.length}: "${searchName}"`);

      try {
        await this.downloadBySearchName(searchName, options);
      } catch (error) {
        _error(`Search error"${searchName}":`, error.message);

        if (!options.skipErrors) {
          throw error;
        }
      }

      if (i < searchNames.length - 1) {
        const delay = options.delay || 2000;
        console.log(`Delay between searches: (${delay * 3}ms)...`);
        await sleep(delay * 3);
      }
    }

    success("All searches completed!");
  }

  /**
   * Виконує динамічний пошук з параметрами
   * @param {Object} searchParams - Параметри пошуку
   * @param {Object} options - Налаштування завантаження
   */
  // async downloadByParams(searchParams, options = {}) {
  //   try {
  //     console.log("🔍 Виконання динамічного пошуку...");

  //     const folderName = searchParams.folderName || `dynamic_${Date.now()}`;
  //     this.api.setSearchFolder(folderName);

  //     const searchUrl = this.searchService.createDynamicSearch(searchParams);
  //     console.log(`🌐 URL пошуку: ${searchUrl}`);

  //     await this.downloadImagesAllPages(searchUrl, options, folderName);
  //   } catch (error) {
  //     console.error("❌ Помилка при динамічному пошуку:", error.message);
  //     throw error;
  //   }
  // }

  showAvailableSearches() {
    const searches = this.searchService.getAvailableSearchNames();
    print("Available searches:");
    searches.forEach((name, index) => {
      console.log(`     ${index + 1}. ${name}`);
    });
    console.log("");
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
      print("Browser closed");
    }
  }
}

module.exports = AnimePicturesDownloader;
