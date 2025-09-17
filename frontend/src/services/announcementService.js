import UrlConfig from '../utils/urlConfig';

class AnnouncementService {
  constructor() {
    this.baseURL = UrlConfig.getBackendApiUrl();
  }

  async getAnnouncements() {
    try {
      const response = await fetch(`${this.baseURL}/announcement/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取公告列表失败:', error);
      throw error;
    }
  }
}

export const announcementService = new AnnouncementService();
export default AnnouncementService;