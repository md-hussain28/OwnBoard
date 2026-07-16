import axios, { type AxiosInstance } from "axios";

let instance: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!instance) {
    instance = axios.create({
      baseURL: "/api",
      timeout: 15_000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return instance;
}
