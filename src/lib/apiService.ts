import axios, { AxiosInstance } from "axios";

export class apiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_URL, // e.g. http://localhost:8000/api
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  async sendPostRequest<T>(endpoint: string, payload: any): Promise<T> {
    try {
      const response = await this.client.post<T>(endpoint, payload);
      console.log("res", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Laravel API Error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
