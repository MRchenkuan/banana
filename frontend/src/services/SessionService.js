class SessionService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async getSessions() {
    return this.httpClient.get('/sessions');
  }

  async createSession(title = '新对话') {
    return this.httpClient.post('/sessions', { title });
  }

  async deleteSession(sessionId) {
    return this.httpClient.delete(`/sessions/${sessionId}`);
  }

  async updateSessionTitle(sessionId, title) {
    return this.httpClient.put(`/sessions/${sessionId}`, { title });
  }

  async getSessionMessages(sessionId, page = 1, limit = 20) {
    return this.httpClient.get(`/sessions/${sessionId}/messages?page=${page}&limit=${limit}`);
  }
}

export default SessionService;