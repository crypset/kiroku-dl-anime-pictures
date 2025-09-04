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

  // Спрощена перевірка завантажених зображень
  async getDownloadedImageIds(imageIds, searchName) {
    if (!this.useDatabase) return new Set();

    try {
      const downloadedImages = await Downloaded_Image.findAll({
        where: { imageId: imageIds.map(String), searchName },
        attributes: ['imageId']
      });
      
      return new Set(downloadedImages.map(img => parseInt(img.imageId)));
    } catch (error) {
      _error("Database verification error: " + error.message);
      return new Set();
    }
  }

  async markImageAsDownloaded(imageData, filePath, searchName) {
    if (!this.useDatabase) return;

    try {
      await Downloaded_Image.create({
        imageId: imageData.post.id.toString(),
        searchName,
        fileName: path.basename(filePath),
        filePath,
        fileSize: imageData.post.size,
        downloadUrl: `${DOWNLOAD_BASE_URL}/${imageData.file_url}`,
        md5Hash: imageData.post.md5,
        width: imageData.post.width,
        height: imageData.post.height,
        status: "downloaded"
      });
      print(`Image ${imageData.post.id} added to database`);
    } catch (error) {
      _error("Database insertion error: " + error.message);
    }
  }

  async getSearchInfo(baseSearchUrl) {
    const firstPageData = await this.api.fetchApiData(baseSearchUrl);
    
    if (!firstPageData?.posts?.length) {
      throw new Error("No images found");
    }

    return {
      data: firstPageData,
      totalPages: firstPageData.max_pages || 1,
      totalImages: firstPageData.posts_count
    };
  }

  async downloadImagesAllPages(baseSearchUrl, options = {}, searchName = "default") {
    const { maxImages, delay, skipErrors, maxPages } = options;

    try {
      const searchInfo = await this.getSearchInfo(baseSearchUrl);
      const { data: firstPageData, totalPages, totalImages } = searchInfo;
      const pagesToProcess = maxPages ? Math.min(maxPages, totalPages) : totalPages;

      print(`${totalImages} images found on ${totalPages} pages`);
      print(`${pagesToProcess + 1} pages will be processed`);

      const stats = { success: 0, error: 0, skipped: 0, processed: 0 };

      for (let page = 0; page <= pagesToProcess; page++) {
        try {
          const result = await this.processPage(
            baseSearchUrl, page, firstPageData, maxImages, 
            stats, delay, skipErrors, searchName, pagesToProcess
          );

          Object.keys(stats).forEach(key => stats[key] += result[key] || 0);

          if (maxImages && stats.processed >= maxImages) {
            print(`Image limit reached (${maxImages})`);
            break;
          }

          if (page < pagesToProcess) {
            print(`Delay between pages (${delay * 2}ms)...`);
            await sleep(delay * 2);
          }
        } catch (pageError) {
          stats.error++;
          _error(`Error processing page ${page + 1}: ${pageError.message}`);
          
          if (!skipErrors) throw pageError;
        }
      }

      this.printStats(stats);
    } catch (error) {
      _error("Critical error occurred during download:", error.message);
      throw error;
    }
  }

  async processPage(baseSearchUrl, page, firstPageData, maxImages, stats, delay, skipErrors, searchName, totalPages) {
    print(`Processing page ${page + 1}/${totalPages + 1}`);

    const pageUrl = this.updateUrlPage(baseSearchUrl, page);
    const pageData = page === 0 ? firstPageData : await this.api.fetchApiData(pageUrl);

    if (!pageData?.posts?.length) {
      print(`No images on page ${page + 1}`);
      return { success: 0, error: 0, skipped: 0, processed: 0 };
    }

    // Обмежуємо кількість постів якщо потрібно
    let postsToCheck = pageData.posts;
    if (maxImages && stats.processed + postsToCheck.length > maxImages) {
      const remaining = maxImages - stats.processed;
      postsToCheck = postsToCheck.slice(0, remaining);
    }

    print(`${pageData.posts.length} images found, ${postsToCheck.length} will be processed`);

    return await this.downloadImagesFromPage(
      postsToCheck, page + 1, totalPages + 1, stats.processed, 
      delay, skipErrors, searchName
    );
  }

  async downloadImagesFromPage(posts, currentPage, totalPages, startIndex, delay, skipErrors, searchName) {
    const shouldSkipDownloaded = this.getSkipDownloadedSetting(searchName);
    const stats = { success: 0, error: 0, skipped: 0, processed: posts.length };

    // Отримуємо список вже завантажених зображень
    const downloadedImageIds = shouldSkipDownloaded 
      ? await this.getDownloadedImageIds(posts.map(p => p.id), searchName)
      : new Set();

    const postsToDownload = posts.filter(post => !downloadedImageIds.has(post.id));
    
    if (downloadedImageIds.size > 0) {
      stats.skipped = downloadedImageIds.size;
      print(`Found ${downloadedImageIds.size} already downloaded images`);
    }

    print(`Will download ${postsToDownload.length} new images`);

    for (let i = 0; i < postsToDownload.length; i++) {
      const picture = postsToDownload[i];
      const originalIndex = posts.findIndex(p => p.id === picture.id) + 1;
      const globalIndex = startIndex + originalIndex;

      try {
        print(`[Page ${currentPage}/${totalPages}] [${originalIndex}/${posts.length}] [Total: ${globalIndex}] Processing image ${picture.id}...`);

        await this.downloadSingleImage(picture, delay, searchName);
        stats.success++;
        success(`Image ${picture.id} downloaded successfully`);
      } catch (error) {
        stats.error++;
        _error(`Error processing image ${picture.id}: ${error.message}`);
        
        if (!skipErrors) throw error;
      }

      // Затримка між завантаженнями
      if (i < postsToDownload.length - 1) {
        print(`Waiting ${delay}ms...`);
        await sleep(delay);
      }
    }

    return stats;
  }

  async downloadSingleImage(picture, delay, searchName) {
    // Отримуємо деталі зображення
    const pictureDetails = await this.api.fetchApiData(
      `https://api.anime-pictures.net/api/v3/posts/${picture.id}?extra=similar_pictures&lang=en`
    );

    await sleep(delay);

    // Завантажуємо зображення
    const imageDownloadUrl = `https://api.anime-pictures.net/pictures/download_image/${pictureDetails.file_url}`;
    const filePath = await this.api.downloadImage(imageDownloadUrl, picture.id);

    // Записуємо в базу
    await this.markImageAsDownloaded(pictureDetails, filePath, searchName);
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

  async downloadMultipleSearches(searchNames, options = {}) {
    print(`Start loading: ${searchNames.length} searches...`);

    for (let i = 0; i < searchNames.length; i++) {
      const searchName = searchNames[i];
      print(`Search ${i + 1}/${searchNames.length}: "${searchName}"`);

      try {
        await this.downloadBySearchName(searchName, options);
      } catch (error) {
        _error(`Search error "${searchName}": ${error.message}`);
        
        if (!options.skipErrors) throw error;
      }

      // Затримка між пошуками
      if (i < searchNames.length - 1) {
        const searchDelay = (options.delay || 2000) * 3;
        print(`Delay between searches: ${searchDelay}ms...`);
        await sleep(searchDelay);
      }
    }

    success("All searches completed!");
  }

  printStats(stats) {
    success(`Download completed!`);
    success(`Statistics:`);
    success(`  • Total images: ${stats.processed}`);
    success(`  • Successfully downloaded: ${stats.success}`);
    success(`  • Skipped: ${stats.skipped}`);
    success(`  • Errors: ${stats.error}`);
  }

  showAvailableSearches() {
    const searches = this.searchService.getAvailableSearchNames();
    print("Available searches:");
    searches.forEach((name, index) => {
      print(`  ${index + 1}. ${name}`);
    });
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
      print("Browser closed");
    }
  }
}

module.exports = AnimePicturesDownloader;