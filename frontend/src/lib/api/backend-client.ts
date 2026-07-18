import "server-only";
import axios, { type AxiosInstance } from "axios";
import { serverConfig } from "./config";

let instance: AxiosInstance | null = null;

export function getBackendClient(): AxiosInstance {
  if (!instance) {
    instance = axios.create({
      baseURL: `${serverConfig.BACKEND_API_BASE_URL}/api/v1`,
      timeout: 15_000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return instance;
}
