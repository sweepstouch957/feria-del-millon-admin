/* eslint-disable @typescript-eslint/no-explicit-any */
// services/techniques.service.ts
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
  active?: boolean;
}

export type UpdateTechniqueInput = Partial<CreateTechniqueInput>;

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

/** GET /catalogs/techniques?all=true (for admin, includes inactive) */
export const listTechniques = async (all = true): Promise<TechniqueDoc[]> => {
  const { data } = await apiClient.get<TechniqueDoc[]>(
    "/catalogs/techniques",
    { params: all ? { all: "true" } : {}, withCredentials: true }
  );
  return (data || []).map(normalizeId);
};

/** PATCH /catalogs/techniques/:id */
export const updateTechnique = async (
  id: string,
  payload: UpdateTechniqueInput
): Promise<TechniqueDoc> => {
  const { data } = await apiClient.patch<TechniqueDoc>(
    `/catalogs/techniques/${id}`,
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};

/** DELETE /catalogs/techniques/:id */
export const deleteTechnique = async (id: string): Promise<void> => {
  await apiClient.delete(`/catalogs/techniques/${id}`, { withCredentials: true });
};

/** PATCH /catalogs/techniques/:id/toggle */
export const toggleTechnique = async (id: string): Promise<TechniqueDoc> => {
  const { data } = await apiClient.patch<TechniqueDoc>(
    `/catalogs/techniques/${id}/toggle`,
    {},
    { withCredentials: true }
  );
  return normalizeId(data);
};
