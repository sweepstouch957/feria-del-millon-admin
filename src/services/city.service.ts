/* eslint-disable @typescript-eslint/no-explicit-any */
// services/catalog/cities.service.ts

import apiClient from "src/http/axios";

export interface CityDoc {
  id: string;
  _id?: string;
  legacyId: number;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: obj.id || (obj as any)._id,
});

/** GET /catalogs/cities?active=true (o como expongas el endpoint) */
export const listCities = async (): Promise<CityDoc[]> => {
  const { data } = await apiClient.get<CityDoc[]>("/catalogs/cities", {
    withCredentials: true,
  });
  return (data || []).map(normalizeId);
};
