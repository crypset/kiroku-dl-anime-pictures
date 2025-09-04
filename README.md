# Kiroku DL Anime Pictures

A Node.js application for downloading images from anime-pictures.net with automatic duplicate detection and search management.

## 🌟 Features

- **Bulk Image Download**: Download multiple images from anime-pictures.net searches
- **Cloudflare Bypass**: Uses Playwright to bypass Cloudflare protection (axios won't work)
- **Duplicate Detection**: SQLite database to track downloaded images and skip duplicates
- **Flexible Search**: Support for both direct URLs and tag-based searches
- **Batch Processing**: Process multiple searches with configurable delays
- **Error Handling**: Continue downloading even if individual images fail
- **File Organization**: Automatic folder creation per search with clean file naming

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kiroku-dl-anime-pictures
```

2. Install dependencies:
```bash
npm install
```

3. Configure your searches in `config.json` (see Configuration section)

4. Run the application:
```bash
node index.js
```

## ⚙️ Configuration

The entire application is controlled through `config.json`. Here's the complete configuration structure:

### Basic App Settings
```json
{
  "app": {
    "downloadDir": "downloads",     // Download directory
    "maxRetries": 3,                // Number of retry attempts
    "retryDelay": 5000,            // Delay between retries (ms)
    "logLevel": "info"             // Logging level
  }
}
```

### Browser Configuration
```json
{
  "browser": {
    "headless": true,              // Run browser in headless mode
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "userAgent": "Mozilla/5.0...", // Browser user agent
    "timeout": 30000,              // Page timeout (ms)
    "args": [                      // Additional browser arguments
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  }
}
```

### Download Settings
```json
{
  "download": {
    "delay": 4000,                 // Delay between image downloads (ms)
    "pageDelay": 4000,            // Delay between page processing (ms) 
    "searchDelay": 6000,          // Delay between searches (ms)
    "maxConcurrent": 1,           // Maximum concurrent downloads
    "skipErrors": true,           // Continue on download errors
    "skipDownloaded": true,       // Skip already downloaded images
    "useDatabase": true           // Enable duplicate detection
  }
}
```

### Database Settings
```json
{
  "database": {
    "enabled": true,              // Enable database functionality
    "path": "./data/images.db",   // SQLite database path
    "sync": true                  // Auto-sync database schema
  }
}
```

## 🔍 Search Configuration

You can define searches in two ways:

### Method 1: Direct URL
```json
{
  "name": "Keqing Images",
  "url": "https://anime-pictures.net/posts?page=0&search_tag=keqing+%28genshin+impact%29&order_by=date",
  "skipDownloaded": true
}
```

### Method 2: Tag-based Search
```json
{
  "name": "Genshin Impact Characters",
  "tags": ["genshin impact", "1girl"],      // Required tags
  "deniedTags": ["nsfw", "explicit"],       // Excluded tags  
  "page": 0,                                // Starting page
  "orderBy": "date",                        // Sort order: date, rating, views, downloads
  "skipDownloaded": true                    // Skip duplicates for this search
}
```

### Complete Search Examples
```json
{
  "searches": [
    {
      "name": "Test Search",
      "url": "https://anime-pictures.net/posts?page=0&search_tag=shigureszku&lang=en",
      "skipDownloaded": false
    },
    {
      "name": "Keqing Collection",
      "url": "https://anime-pictures.net/posts?page=0&search_tag=keqing+%28genshin+impact%29&denied_tags=keqing+%28genshin+impact%29%7C%7Cganyu+%28genshin+impact%29%7C%7C&order_by=date&ldate=0&lang=en",
      "skipDownloaded": true
    },
    {
      "name": "Anime Girls",
      "tags": ["anime", "1girl", "solo"],
      "deniedTags": ["male"],
      "page": 0,
      "orderBy": "date",
      "skipDownloaded": true
    },
    {
      "name": "Landscapes",
      "tags": ["landscape", "scenery", "no humans"],
      "page": 0,
      "orderBy": "score",
      "skipDownloaded": true
    }
  ]
}
```

## 🎯 Usage Examples

### Basic Usage
Run all configured searches:
```bash
node index.js
```

### Programmatic Usage
```javascript
const AnimePicturesDownloader = require('./src/module/anime-pictures_net/anime-pictures_downloader');

const downloader = new AnimePicturesDownloader();

async function main() {
  await downloader.init();
  
  // Download specific search
  await downloader.downloadBySearchName("Keqing Collection", {
    maxImages: 50,    // Limit to 50 images
    maxPages: 3,      // Limit to 3 pages
    delay: 4000,      // 4 second delay between downloads
    skipErrors: true  // Continue on errors
  });
  
  await downloader.cleanup();
}

main();
```

## 🗃️ Database Features

When `useDatabase: true` and `skipDownloaded: true`:

- **Automatic Tracking**: Each downloaded image is recorded with metadata
- **Duplicate Prevention**: Skip images that were already downloaded
- **Search History**: Track which searches have been processed
- **File Integrity**: Store MD5 hashes and file paths
- **Metadata Storage**: Image dimensions, file size, download URLs

### Database Schema
The application creates a `Downloaded_Image` table with:
- `imageId`: Unique image identifier
- `searchName`: Which search downloaded this image
- `fileName`: Local file name
- `filePath`: Full path to downloaded file
- `fileSize`: File size in bytes
- `downloadUrl`: Original download URL
- `md5Hash`: File integrity hash
- `width/height`: Image dimensions
- `status`: Download status

## 📁 File Organization

Downloads are organized as follows:
```
downloads/
├── Search Name 1/
│   ├── 12345_original_filename.jpg
│   ├── 12346_another_image.png
│   └── ...
├── Search Name 2/
│   ├── 54321_image.gif
│   └── ...
└── data/
    └── images.db
```

## ⚡ Why Playwright?

This application uses Playwright instead of simple HTTP requests because:

- **Cloudflare Protection**: anime-pictures.net uses Cloudflare protection
- **JavaScript Rendering**: Some content requires JavaScript execution  
- **Browser Headers**: Proper browser headers and behavior simulation
- **Session Management**: Maintains cookies and session state
- **Reliability**: More reliable than trying to bypass protection manually

## 🔧 Troubleshooting

### Common Issues

**Browser fails to start:**
```bash
# Install Playwright browsers
npx playwright install
```

**Database errors:**
- Check if `./data/` directory exists and is writable
- Ensure SQLite3 is properly installed

**Downloads failing:**
- Check your internet connection
- Verify the search URLs are valid
- Try reducing concurrent downloads (`maxConcurrent: 1`)

**Memory issues:**
- Reduce `maxConcurrent` to 1
- Add more delay between downloads
- Process fewer pages at once

### Debug Mode
Set `headless: false` in config.json to see the browser in action.

## 📊 Performance Tips

1. **Optimal Delays**: 
   - `delay: 4000ms` between images
   - `pageDelay: 4000ms` between pages
   - `searchDelay: 6000ms` between searches

2. **Resource Management**:
   - Use `maxConcurrent: 1` to avoid overwhelming the server
   - Enable `skipDownloaded: true` to avoid re-downloading
   - Set reasonable `maxImages` and `maxPages` limits

3. **Error Handling**:
   - Keep `skipErrors: true` for long-running downloads
   - Monitor logs for recurring issues

## 📄 License

ISC License - see package.json for details.

## 👨‍💻 Author

Seth The White (crypset)

---

⚠️ **Disclaimer**: This tool is for educational purposes. Please respect anime-pictures.net's terms of service and don't overload their servers with excessive requests.