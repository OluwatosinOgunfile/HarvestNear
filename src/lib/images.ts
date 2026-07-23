function blobVersion(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return encodeURIComponent(pathname.slice(pathname.lastIndexOf("/") + 1));
  } catch {
    return "";
  }
}

export function listingImageUrl(listingId: string, url: unknown) {
  const value = url ? String(url) : "";
  return value.includes(".blob.vercel-storage.com") ? `/api/images/listings/${listingId}?v=${blobVersion(value)}` : value;
}

export function profileImageUrl(userId: string, url: unknown) {
  const value = url ? String(url) : "";
  return value.includes(".blob.vercel-storage.com") ? `/api/images/profiles/${userId}?v=${blobVersion(value)}` : value;
}
