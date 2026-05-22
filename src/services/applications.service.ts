import apiClient from "@/axios";

export interface ArtworkImageEntry {
  _id?: string;
  url: string;
  title: string;
  technique?: string;
  dimensions?: string;
  year?: number;
  price?: number;
  currency?: string;
  role?: "project" | "detail" | "montage";
}

export interface ArtistApplication {
  _id: string;
  convocatoria: { _id: string; name: string; slug: string; fee: number; currency: string } | string;
  artist: { _id: string; firstName: string; lastName: string; email: string; mobile?: string; city?: string } | string;
  status: "pending_payment" | "draft" | "submitted" | "under_review" | "revision_requested" | "accepted" | "rejected";
  paymentStatus: "pending" | "approved" | "rejected" | "cancelled";
  isPaid: boolean;
  paidAt?: string;
  cvUrl?: string;
  profilePhotoUrl?: string;
  bio?: string;
  projectReview?: string;
  artworkImages: ArtworkImageEntry[];
  detailImageUrl?: string;
  montageImageUrl?: string;
  adminNotes?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationListParams {
  status?: string;
  convocatoria?: string;
  isPaid?: boolean | string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface ApplicationListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  docs: ArtistApplication[];
}

const ADMIN_HEADERS = { "x-user-admin": "true" };

export interface ApplicationStats {
  total: number;
  paid: number;
  byStatus: Record<string, number>;
}

export const getApplicationStats = async (): Promise<ApplicationStats> => {
  const { data } = await apiClient.get("/applications/applications/stats", { headers: ADMIN_HEADERS });
  return data;
};

export const listApplications = async (params: ApplicationListParams = {}): Promise<ApplicationListResponse> => {
  const { data } = await apiClient.get("/applications/applications", { params, headers: ADMIN_HEADERS });
  return data;
};

export const getApplicationById = async (id: string): Promise<ArtistApplication> => {
  const { data } = await apiClient.get(`/applications/applications/${id}`, { headers: ADMIN_HEADERS });
  return data.doc;
};

export const reviewApplication = async (
  id: string,
  decision: "accepted" | "rejected",
  payload: { notes?: string; rejectionReason?: string }
): Promise<{ ok: boolean; doc: ArtistApplication }> => {
  const { data } = await apiClient.patch(
    `/applications/applications/${id}/review`,
    { decision, ...payload },
    { headers: ADMIN_HEADERS }
  );
  return data;
};

export const setUnderReview = async (id: string): Promise<{ ok: boolean }> => {
  const { data } = await apiClient.patch(
    `/applications/applications/${id}/under-review`,
    {},
    { headers: ADMIN_HEADERS }
  );
  return data;
};

export const markAsPaid = async (id: string): Promise<{ ok: boolean; doc: ArtistApplication }> => {
  const { data } = await apiClient.patch(
    `/applications/applications/${id}/mark-paid`,
    {},
    { headers: ADMIN_HEADERS }
  );
  return data;
};

export const deleteApplication = async (id: string): Promise<{ ok: boolean }> => {
  const { data } = await apiClient.delete(
    `/applications/applications/${id}`,
    { headers: ADMIN_HEADERS }
  );
  return data;
};

export const requestRevision = async (
  id: string,
  notes: string
): Promise<{ ok: boolean; doc: ArtistApplication }> => {
  const { data } = await apiClient.patch(
    `/applications/applications/${id}/request-revision`,
    { notes },
    { headers: ADMIN_HEADERS }
  );
  return data;
};
