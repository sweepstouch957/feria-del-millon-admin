/* eslint-disable @typescript-eslint/no-explicit-any */
// services/catalog/techniques.service.ts
import apiClient from "@/axios";


export interface TechniqueDoc {
  id: string;
  _id?: string;
  name: string;
  slug?: string;
  order?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTechniqueInput {
  name: string;
  slug?: string;
  order?: number;
  active?: boolean; // default true en tu modelo
}

const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: obj.id || (obj as any)._id,
});

/** POST /catalogs/techniques */
export const createTechnique = async (
  payload: CreateTechniqueInput
): Promise<TechniqueDoc> => {
  const { data } = await apiClient.post<TechniqueDoc>(
    "/catalogs/techniques",
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};

/** GET /catalogs/techniques  (active=true, sort by order asc) */
export const listTechniques = async (): Promise<TechniqueDoc[]> => {
  const { data } = await apiClient.get<TechniqueDoc[]>(
    "/catalogs/techniques",
    { withCredentials: true }
  );
  return (data || []).map(normalizeId);
};
