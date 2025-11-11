import apiClient from "@/axios";

export interface UploadResponse {
  url: string;
  public_id: string;
}

export const uploadCampaignImage = async (
  image: File,
  folder: string = 'feria-del-millon'
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('folder', folder);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data; // { url, public_id }
};
