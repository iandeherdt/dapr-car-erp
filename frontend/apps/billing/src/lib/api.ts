const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:4000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
