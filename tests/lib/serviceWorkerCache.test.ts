import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

const origin = 'https://progresspal.test';
const workerSource = readFileSync(path.resolve('public/sw.js'), 'utf8');
const cacheVersion = 'progresspal-cache-v1.4.0';
const shell = (version: string) =>
  `<!doctype html><script type="module" src="/assets/app-${version}.js"></script><link rel="stylesheet" href="/assets/app-${version}.css">`;
const htmlResponse = (html: string) =>
  new Response(html, { headers: { 'Content-Type': 'text/html' } });

type RequestLike = { method: string; mode: string; url: string };
type WorkerEvent = {
  request?: RequestLike;
  respondWith?: (response: Promise<Response>) => void;
  waitUntil?: (work: Promise<void>) => void;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createWorker() {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const stored = new Map<string, Response>();
  const network = new Map<string, () => Promise<Response>>();
  const key = (input: string | RequestLike) =>
    new URL(typeof input === 'string' ? input : input.url, origin).pathname;
  const fetch = vi.fn(async (input: string | RequestLike) => {
    const respond = network.get(key(input));
    if (!respond) throw new TypeError(`Offline or missing: ${key(input)}`);
    return respond();
  });
  const cache = {
    match: vi.fn(async (input: string | RequestLike) =>
      stored.get(key(input))?.clone(),
    ),
    put: vi.fn(async (input: string | RequestLike, response: Response) => {
      stored.set(key(input), response.clone());
    }),
    addAll: vi.fn(async (inputs: string[]) => {
      const responses = await Promise.all(inputs.map((input) => fetch(input)));
      if (responses.some((response) => !response.ok))
        throw new TypeError('Failed cache addAll');
      inputs.forEach((input, index) =>
        stored.set(key(input), responses[index]!.clone()),
      );
    }),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [cacheVersion]),
    delete: vi.fn(async () => true),
  };
  const skipWaiting = vi.fn(async () => undefined);
  runInNewContext(workerSource, {
    self: {
      location: new URL(origin),
      addEventListener: (
        name: string,
        listener: (event: WorkerEvent) => void,
      ) => handlers.set(name, listener),
      skipWaiting,
      clients: { claim: vi.fn(async () => undefined) },
    },
    fetch,
    caches,
    URL,
  });

  function serve(version: string, route = '/rpg') {
    network.set(route, async () => htmlResponse(shell(version)));
    network.set(
      `/assets/app-${version}.js`,
      async () =>
        new Response(`/* ${version} script */`, {
          headers: { 'Content-Type': 'text/javascript' },
        }),
    );
    network.set(
      `/assets/app-${version}.css`,
      async () =>
        new Response(`/* ${version} styles */`, {
          headers: { 'Content-Type': 'text/css' },
        }),
    );
    network.set(
      '/assets/character-profile.png',
      async () =>
        new Response('synthetic image', {
          headers: { 'Content-Type': 'image/png' },
        }),
    );
  }

  function prime(version: string) {
    stored.set('/index.html', htmlResponse(shell(version)));
    stored.set('/', htmlResponse(shell(version)));
    stored.set(
      `/assets/app-${version}.js`,
      new Response(`/* ${version} script */`, {
        headers: { 'Content-Type': 'text/javascript' },
      }),
    );
    stored.set(
      `/assets/app-${version}.css`,
      new Response(`/* ${version} styles */`, {
        headers: { 'Content-Type': 'text/css' },
      }),
    );
  }

  function request(route: string, mode = 'navigate') {
    let response!: Promise<Response>;
    handlers.get('fetch')!({
      request: { url: `${origin}${route}`, mode, method: 'GET' },
      respondWith: (value) => {
        response = value;
      },
    });
    return response;
  }

  function install() {
    let work!: Promise<void>;
    handlers.get('install')!({
      waitUntil: (value) => {
        work = value;
      },
    });
    return work;
  }

  return {
    cache,
    caches,
    fetch,
    install,
    network,
    prime,
    request,
    serve,
    skipWaiting,
    stored,
  };
}

describe('service worker boot-set updates', () => {
  it('caches a same-version upgrade from the exact navigation response and boots it offline', async () => {
    const worker = createWorker();
    worker.prime('old');
    worker.serve('candidate');
    worker.serve('different', '/index.html');

    expect(await (await worker.request('/rpg')).text()).toBe(
      shell('candidate'),
    );
    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('candidate'),
    );
    expect(worker.stored.has('/assets/app-candidate.js')).toBe(true);
    expect(worker.stored.has('/assets/app-candidate.css')).toBe(true);
    expect(
      worker.fetch.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : input.url,
      ),
    ).not.toContain('/index.html');
    expect(worker.stored.has('/assets/app-different.js')).toBe(false);
    expect(worker.stored.has('/assets/app-old.js')).toBe(true);
    expect(worker.caches.open).toHaveBeenCalledWith(cacheVersion);

    worker.network.clear();
    expect(
      await (await worker.request('/rpg/resource/week-4-lecture')).text(),
    ).toBe(shell('candidate'));
    expect(
      await (await worker.request('/assets/app-candidate.js', 'cors')).text(),
    ).toBe('/* candidate script */');
  });

  it('refreshes another build without requiring a new worker install or cache version', async () => {
    const worker = createWorker();
    worker.prime('old');
    worker.serve('first');
    await worker.request('/rpg');
    worker.serve('second');
    await worker.request('/rpg');

    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('second'),
    );
    expect(worker.stored.has('/assets/app-second.js')).toBe(true);
    expect(worker.stored.has('/assets/app-second.css')).toBe(true);
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it.each([
    'network',
    '404',
    'partial script response',
    'HTML script rewrite',
    'HTML stylesheet rewrite',
    'cross-origin redirect',
    'asset quota',
    'shell quota',
  ])(
    'retains the previous offline shell on %s while returning the fresh online response',
    async (failure) => {
      const worker = createWorker();
      worker.prime('old');
      worker.serve('candidate');
      if (failure === 'network')
        worker.network.delete('/assets/app-candidate.js');
      if (failure === '404')
        worker.network.set(
          '/assets/app-candidate.js',
          async () => new Response('Missing', { status: 404 }),
        );
      if (failure === 'partial script response')
        worker.network.set(
          '/assets/app-candidate.js',
          async () =>
            new Response('partial script', {
              status: 206,
              headers: { 'Content-Type': 'text/javascript' },
            }),
        );
      if (failure === 'HTML script rewrite')
        worker.network.set('/assets/app-candidate.js', async () =>
          htmlResponse(shell('candidate')),
        );
      if (failure === 'HTML stylesheet rewrite')
        worker.network.set('/assets/app-candidate.css', async () =>
          htmlResponse(shell('candidate')),
        );
      if (failure === 'cross-origin redirect')
        worker.network.set('/assets/app-candidate.js', async () => {
          const response = new Response('remote script', {
            headers: { 'Content-Type': 'text/javascript' },
          });
          Object.defineProperty(response, 'url', {
            value: 'https://other.test/assets/app-candidate.js',
          });
          return response;
        });
      if (failure.endsWith('quota')) {
        const originalPut = worker.cache.put.getMockImplementation()!;
        worker.cache.put.mockImplementation(async (input, response) => {
          if (
            input ===
            (failure === 'shell quota'
              ? '/index.html'
              : '/assets/app-candidate.js')
          )
            throw new DOMException('Full', 'QuotaExceededError');
          await originalPut(input, response);
        });
      }

      expect(await (await worker.request('/rpg')).text()).toBe(
        shell('candidate'),
      );
      expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
        shell('old'),
      );
      if (failure.includes('rewrite'))
        expect(
          worker.stored.has(
            `/assets/app-candidate.${failure.includes('stylesheet') ? 'css' : 'js'}`,
          ),
        ).toBe(false);
      worker.network.clear();
      expect(await (await worker.request('/rpg')).text()).toBe(shell('old'));
      expect(
        await (await worker.request('/assets/app-old.js', 'cors')).text(),
      ).toBe('/* old script */');
    },
  );

  it('does not cache a 200 HTML rewrite from an unrelated static request', async () => {
    const worker = createWorker();
    worker.network.set('/assets/unknown.js', async () =>
      htmlResponse(shell('old')),
    );
    expect(
      await (await worker.request('/assets/unknown.js', 'cors')).text(),
    ).toBe(shell('old'));
    expect(worker.stored.has('/assets/unknown.js')).toBe(false);
  });

  it('requires a complete same-origin boot set before replacing the offline shell', async () => {
    const worker = createWorker();
    worker.prime('old');
    const invalidHtml =
      '<script src="https://other.test/assets/remote.js"></script><link href="/assets/app-new.css" rel="stylesheet">';
    worker.network.set('/rpg', async () => htmlResponse(invalidHtml));

    expect(await (await worker.request('/rpg')).text()).toBe(invalidHtml);
    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('old'),
    );
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });

  it('installs the validated boot set and fixed avatar before activation', async () => {
    const worker = createWorker();
    worker.serve('fresh', '/index.html');
    worker.network.set('/', async () => htmlResponse(shell('fresh')));
    await worker.install();

    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('fresh'),
    );
    expect(worker.stored.has('/assets/app-fresh.js')).toBe(true);
    expect(worker.stored.has('/assets/app-fresh.css')).toBe(true);
    expect(worker.stored.has('/assets/character-profile.png')).toBe(true);
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it('rejects an incomplete install without replacing an existing offline shell', async () => {
    const worker = createWorker();
    worker.prime('old');
    worker.serve('candidate', '/index.html');
    worker.network.set('/', async () => htmlResponse(shell('candidate')));
    worker.network.set('/assets/app-candidate.js', async () =>
      htmlResponse(shell('candidate')),
    );

    await expect(worker.install()).rejects.toThrow();
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('old'),
    );
  });

  it('does not let a slower earlier navigation response overwrite a newer shell', async () => {
    const worker = createWorker();
    worker.prime('old');
    worker.serve('earlier', '/earlier');
    worker.serve('newer', '/newer');
    const delayed = deferred<Response>();
    worker.network.set('/earlier', () => delayed.promise);
    const earlier = worker.request('/earlier');
    await worker.request('/newer');
    delayed.resolve(htmlResponse(shell('earlier')));
    await earlier;

    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('newer'),
    );
  });

  it('serializes shell writes when a newer navigation starts during an older cache put', async () => {
    const worker = createWorker();
    worker.prime('old');
    worker.serve('earlier', '/earlier');
    worker.serve('newer', '/newer');
    const started = deferred<void>();
    const release = deferred<void>();
    const originalPut = worker.cache.put.getMockImplementation()!;
    worker.cache.put.mockImplementation(async (input, response) => {
      if (
        input === '/index.html' &&
        (await response.clone().text()) === shell('earlier')
      ) {
        started.resolve();
        await release.promise;
      }
      await originalPut(input, response);
    });
    const earlier = worker.request('/earlier');
    await started.promise;
    const newer = worker.request('/newer');
    await setImmediate();
    release.resolve();
    await Promise.all([earlier, newer]);

    expect(await worker.stored.get('/index.html')!.clone().text()).toBe(
      shell('newer'),
    );
  });
});
