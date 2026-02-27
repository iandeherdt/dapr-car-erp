const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BFF_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return handleResponse<T>(res);
}
