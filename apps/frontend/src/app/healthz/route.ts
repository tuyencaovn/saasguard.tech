// Liveness endpoint for container healthchecks: always 200, no auth, no page render.
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}
