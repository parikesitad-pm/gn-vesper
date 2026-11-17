// Loaded only by the isolated integration server, never by the application.
const fetchNetwork = globalThis.fetch;
const repo = owner => ({ id: owner === 'alice' ? 10 : 20, full_name: `${owner}/private`, private: true, html_url: `https://github.com/${owner}/private`, description: 'Integration fixture', default_branch: 'main' });
const pull = { number: 3, title: 'Fixture change', html_url: 'https://github.com/alice/private/pull/3', state: 'open', user: { login: 'alice' }, head: { sha: 'abc' }, updated_at: '2026-11-17T00:00:00Z', body: 'Fixture description', requested_reviewers: [{ login: 'alice' }] };
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input));
  if (url.origin === 'https://github.com' && url.pathname === '/login/oauth/access_token') {
    const body = JSON.parse(init.body);
    if (body.refresh_token === 'fixture-revoked') return Response.json({ error: 'bad_refresh_token' }, { status: 400 });
    const owner = body.code === 'bob' ? 'bob' : 'alice';
    return Response.json({ access_token: `fixture-${owner}`, refresh_token: body.code === 'revoked' ? 'fixture-revoked' : `fixture-refresh-${owner}`, expires_in: ['expired', 'revoked'].includes(body.code) ? 1 : 28800 });
  }
  if (url.origin !== 'https://api.github.com') return fetchNetwork(input, init);
  if (!new Headers(init?.headers).get('authorization')) return Response.json({ message: 'Not found' }, { status: 404 });
  const owner = new Headers(init?.headers).get('authorization') === 'Bearer fixture-bob' ? 'bob' : 'alice';
  if (url.pathname === '/user') return Response.json({ id: owner === 'alice' ? 1 : 2, login: owner });
  if (url.pathname === '/user/installations') return Response.json({ installations: [{ id: 1 }], total_count: 1 });
  if (url.pathname === '/user/installations/1/repositories') return Response.json({ repositories: [repo(owner)], total_count: 1 });
  if (!url.pathname.startsWith(`/repos/${owner}/private`)) return Response.json({ message: 'Not found' }, { status: 404 });
  if (url.pathname.endsWith('/reviews')) return Response.json([{ user: { login: 'reviewer' }, state: 'APPROVED' }]);
  if (url.pathname.endsWith('/check-runs')) return Response.json({ check_runs: [{ name: 'Tests', status: 'completed', conclusion: 'success', html_url: 'https://github.com/alice/private/actions/runs/1' }] });
  if (url.pathname.endsWith('/pulls/3')) return Response.json(pull);
  if (url.pathname.endsWith('/pulls')) return Response.json([pull]);
  return Response.json(repo(owner));
};
