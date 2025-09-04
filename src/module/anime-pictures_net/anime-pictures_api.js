const fs = require("fs").promises;
const path = require("path");

const { print, _error } = require("../../shared/utils");
const {
  DOWNLOAD_DIR,
  USERAGENT,
  BROWSER_TIMEOUT,
} = require("../../config/app.config");

class AnimePicturesApi {
  constructor(context) {
    this.context = context;
    this.downloadDir = path.join(process.cwd(), DOWNLOAD_DIR);
    this.currentSearchFolder = null;
  }

  setSearchFolder(searchName) {
    this.currentSearchFolder = searchName.replace(/[<>:"/\\|?*]/g, "_").trim();
  }

  getDownloadPath() {
    return this.currentSearchFolder 
      ? path.join(this.downloadDir, this.currentSearchFolder)
      : this.downloadDir;
  }

  async ensureDownloadDir() {
    try {
      const downloadPath = this.getDownloadPath();
      await fs.mkdir(downloadPath, { recursive: true });
      
      if (this.currentSearchFolder) {
        print(`Folder created/verified: ${downloadPath}`);
      }
    } catch (error) {
      _error("Directory creation error: " + error.message);
    }
  }

  async fetchApiData(url) {
    let page;
    try {
      page = await this.context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      
      const data = await page.evaluate(() => document.body.innerText);
      return JSON.parse(data);
    } catch (error) {
      _error("Error fetching API data: " + error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  getFileExtension(contentType, originalFileName) {
    if (originalFileName && path.extname(originalFileName)) {
      return path.extname(originalFileName);
    }
    
    const extensions = {
      'png': '.png',
      'jpeg': '.jpeg', 
      'gif': '.gif',
      'webp': '.webp'
    };
    
    for (const [type, ext] of Object.entries(extensions)) {
      if (contentType.includes(type)) return ext;
    }
    
    return '.jpg';
  }


  generateFileName(imageId, originalFileName, extension) {
    const cleanOriginalName = originalFileName?.replace(/[<>:"/\\|?*]/g, "_");
    
    if (cleanOriginalName && cleanOriginalName !== `${imageId}${extension}`) {
      return `${imageId}_${cleanOriginalName}`;
    }
    
    return `${imageId}${extension}`;
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async downloadImage(url, imageId) {
    let page;
    try {
      await this.ensureDownloadDir();
      page = await this.context.newPage();

      print(`Go to URL: ${url}`);

      await page.setExtraHTTPHeaders({
        "User-Agent": USERAGENT,
        "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      });

      const response = await page.request.get(url, { timeout: BROWSER_TIMEOUT });
      
      print(`Response status: ${response.status()}`);

      if (!response.ok()) {
        throw new Error(`HTTP error: ${response.status()}`);
      }

      const contentType = response.headers()["content-type"];
      if (!contentType.includes("image")) {
        const body = await response.text();
        _error("Received non-image: " + body.slice(0, 500));
        throw new Error(`Expected image, got ${contentType}`);
      }

      const buffer = await response.body();
      const contentDisposition = response.headers()["content-disposition"];

      let originalFileName = null;
      const match = contentDisposition?.match(/filename="(.+?)"/);
      if (match?.[1]) {
        originalFileName = match[1];
      }

      const extension = this.getFileExtension(contentType, originalFileName);
      const fileName = this.generateFileName(imageId, originalFileName, extension);
      const filePath = path.join(this.getDownloadPath(), fileName);

      if (await this.checkFileExists(filePath)) {
        print(`File ${fileName} already exists, skipping`);
        return filePath;
      }

      await fs.writeFile(filePath, buffer);

      const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      print(`Image saved: ${fileName} (${fileSizeMB} MB)`);
      print(`Path: ${filePath}`);

      return filePath;
    } catch (error) {
      _error("Error downloading image " + imageId + ": " + error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }
}

module.exports = AnimePicturesApi;