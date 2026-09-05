import { supabase } from "../../lib/supabase";

const BUCKET_MESAS = "mesas";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function subirFotoMesa(fotoBase64: string): Promise<string> {
  const path = `mesa-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_MESAS)
    .upload(path, base64ToArrayBuffer(fotoBase64), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      "No se pudo subir la foto. Verificá que exista el bucket mesas y sus permisos.",
    );
  }

  const { data } = supabase.storage.from(BUCKET_MESAS).getPublicUrl(path);
  return data.publicUrl;
}

export async function eliminarFotoMesa(pathOrUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET_MESAS}/`;
  const path = pathOrUrl.includes(marker)
    ? pathOrUrl.slice(pathOrUrl.indexOf(marker) + marker.length)
    : pathOrUrl;

  await supabase.storage.from(BUCKET_MESAS).remove([path]);
}
