// Shared by the API route tests.
export const jsonReq = (body, url = 'http://localhost/api/x', method = 'POST') =>
  new Request(url, { method, headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
export const getReq = (url = 'http://localhost/api/x') => new Request(url);
