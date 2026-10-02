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

/** Mismo endpoint para documentos (PDF de bases, términos). El campo se llama
 *  `image` porque así lo espera el servicio; Cloudinary guarda el PDF como
 *  imagen y de ahí sale su portada. */
export const uploadDocument = (file: File, folder = 'documentos') =>
  uploadCampaignImage(file, folder);
