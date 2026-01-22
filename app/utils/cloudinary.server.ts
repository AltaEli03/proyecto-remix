// app/utils/cloudinary.server.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || "mi-app";

// Subir imagen
export async function uploadImageToCloudinary(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: FOLDER,
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result!);
            }
        );
        uploadStream.end(buffer);
    });
}

// Obtener todas las imágenes de la carpeta
export async function getImagesFromCloudinary() {
    const result = await cloudinary.api.resources({
        type: "upload",
        prefix: FOLDER,
        max_results: 100,
        resource_type: "image",
    });
    
    return result.resources;
}

// Eliminar una imagen por su public_id
export async function deleteImageFromCloudinary(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
}