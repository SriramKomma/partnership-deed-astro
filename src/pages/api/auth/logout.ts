import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ redirect, cookies }) => {
  // Clear the auth session cookie
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  return redirect('/login');
};
