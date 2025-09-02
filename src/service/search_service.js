const {} = require("../config/app.config");

class SearchService {
  constructor(config) {
    this.config = config;
    this.baseApiUrl = "https://api.anime-pictures.net/api/v3/posts";
  }

  /**
   * Отримує всі налаштовані пошуки з конфігурації
   * @returns {Array} Масив об'єктів пошуків
   */
  getSearches() {
    return this.config.searches || [];
  }

  /**
   * Знаходить пошук за назвою
   * @param {string} name - Назва пошуку
   * @returns {Object|null} Об'єкт пошуку або null
   */
  getSearchByName(name) {
    return this.getSearches().find((search) => search.name === name) || null;
  }

  /**
   * Формує URL для API на основі параметрів пошуку
   * @param {Object} search - Об'єкт пошуку
   * @returns {string} Готовий URL для API
   */
  buildSearchUrl(search) {
    // Якщо вже є готове посилання - використовуємо його
    if (search.url) {
      const apiUrl = search.url.replace(
        "https://anime-pictures.net/",
        "https://api.anime-pictures.net/api/v3/"
      );
      return apiUrl;
    }

    const params = new URLSearchParams();

    // Додаємо базові параметри з конфігурації
    const defaultParams = this.config.settings?.defaultParams || {};
    params.append("lang", defaultParams.lang || "en");
    params.append("page", search.page ?? defaultParams.page ?? 0);
    params.append(
      "order_by",
      search.orderBy || defaultParams.orderBy || "date"
    );

    // Формуємо теги для пошуку
    if (search.tags && search.tags.length > 0) {
      const searchTags = search.tags.join("+");
      params.append("search_tag", searchTags);
    }

    // Формуємо заборонені теги
    if (search.deniedTags && search.deniedTags.length > 0) {
      const deniedTags = search.deniedTags.join("||");
      params.append("denied_tags", deniedTags + "||");
    }

    // Додаткові параметри
    if (search.ldate !== undefined) {
      params.append("ldate", search.ldate);
    }

    return `${this.baseApiUrl}?${params.toString()}`;
  }

  /**
   * Виконує пошук за назвою
   * @param {string} searchName - Назва пошуку з конфігурації
   * @returns {string} URL для API
   * @throws {Error} Якщо пошук не знайдено
   */
  executeSearch(searchName) {
    const search = this.getSearchByName(searchName);

    if (!search) {
      throw new Error(`Пошук "${searchName}" не знайдено в конфігурації`);
    }

    return this.buildSearchUrl(search);
  }

  /**
   * Створює динамічний пошук з параметрами
   * @param {Object} params - Параметри пошуку
   * @param {Array} params.tags - Теги для пошуку
   * @param {Array} params.deniedTags - Заборонені теги
   * @param {number} params.page - Номер сторінки
   * @param {string} params.orderBy - Сортування
   * @returns {string} URL для API
   */
  createDynamicSearch(params) {
    const searchObject = {
      tags: params.tags || [],
      deniedTags: params.deniedTags || [],
      page: params.page,
      orderBy: params.orderBy,
    };

    return this.buildSearchUrl(searchObject);
  }

  /**
   * Отримує список всіх доступних пошуків
   * @returns {Array} Масив назв пошуків
   */
  getAvailableSearchNames() {
    return this.getSearches().map((search) => search.name);
  }
}

module.exports = SearchService;
