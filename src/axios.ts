// axios.ts
import axios from "axios";
import Cookies from "js-cookie";
import {  AUTH_TOKEN_KEY } from "./core/constants";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  // solo setear Authorization si NO viene ya en headers
  if (!config.headers?.Authorization) {
    const authToken = Cookies.get(AUTH_TOKEN_KEY); // tu token normal de usuario (opcional/legible)
    if (authToken) {
      if (config.headers) {
        config.headers["Authorization"] = `Bearer ${authToken}`;
      }
    }

  }
  return config;
});

export default apiClient;
