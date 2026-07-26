export async function readJsonResponse<T extends object>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body.trim()) return {} as T;

  try {
    return JSON.parse(body) as T;
  } catch {
    const message = response.ok
      ? "The server returned an invalid response"
      : body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    return { error: message || `Request failed with status ${response.status}` } as T;
  }
}
