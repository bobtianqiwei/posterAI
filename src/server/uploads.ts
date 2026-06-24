const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const uploads = new Map<string, { data: Uint8Array; contentType: string }>();

function mime(filename: string): string {
  return MIME[filename.split(".").pop()?.toLowerCase() || "png"] || "application/octet-stream";
}

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function putUpload(filename: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<string> {
  const safe = sanitize(filename);
  uploads.set(safe, { data: new Uint8Array(data), contentType: contentType || mime(safe) });
  return `/api/uploads/${safe}`;
}

export async function getUpload(filename: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const safe = sanitize(filename);
  const upload = uploads.get(safe);
  if (!upload) return null;
  const data = upload.data.slice();
  return {
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    contentType: upload.contentType,
  };
}

export async function deleteUpload(filename: string): Promise<void> {
  const safe = sanitize(filename);
  uploads.delete(safe);
}

export async function readUploadAsBase64DataUrl(filename: string): Promise<string | null> {
  const safe = sanitize(filename);
  const upload = uploads.get(safe);
  if (!upload) return null;
  return `data:${upload.contentType};base64,${Buffer.from(upload.data).toString("base64")}`;
}
