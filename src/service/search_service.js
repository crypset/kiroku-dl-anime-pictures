const { BASE_URL } = require("../config/app.config");

class SearchService {
  constructor(config) {
    this.config = config;
    this.baseApiUrl = BASE_URL;
  }

  getSearches() {
    return this.config.searches || [];
  }

  getSearchByName(name) {
    return this.getSearches().find((search) => search.name === name) || null;
  }

  buildSearchUrl(search) {
    if (search.url) {
      return search.url.replace(
        "https://anime-pictures.net/",
        "https://api.anime-pictures.net/api/v3/"
      );
    }

    const defaultParams = this.config.settings?.defaultParams || {};
    const params = new URLSearchParams({
      lang: defaultParams.lang || "en",
      page: search.page ?? defaultParams.page ?? 0,
      order_by: search.orderBy || defaultParams.orderBy || "date",
    });

    if (search.tags?.length > 0) {
      params.append("search_tag", search.tags.join("+"));
    }

    if (search.deniedTags?.length > 0) {
      params.append("denied_tags", search.deniedTags.join("||") + "||");
    }

    if (search.ldate !== undefined) {
      params.append("ldate", search.ldate);
    }

    return `${this.baseApiUrl}?${params.toString()}`;
  }

  executeSearch(searchName) {
    const search = this.getSearchByName(searchName);

    if (!search) {
      throw new Error(`Search "${searchName}" not found in configuration`);
    }

    return this.buildSearchUrl(search);
  }

  createDynamicSearch(params) {
    return this.buildSearchUrl(params);
  }

  getAvailableSearchNames() {
    return this.getSearches().map((search) => search.name);
  }
}

module.exports = SearchService;
