export function listingImageUrl(listingId: string, url: unknown) {
  const value = url ? String(url) : "";
  return value.includes(".blob.vercel-storage.com") ? `/api/images/listings/${listingId}` : value;
}

export function profileImageUrl(userId: string, url: unknown) {
  const value = url ? String(url) : "";
  return value.includes(".blob.vercel-storage.com") ? `/api/images/profiles/${userId}` : value;
}
