/* ========== Twitch Random Streamer — Background Service Worker ========== */

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_URL = 'https://api.twitch.tv/helix';

// ===== Message Listener =====

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'findRandomStream') {
        handleFindRandomStream(message.filters)
            .then(sendResponse)
            .catch((err) => sendResponse({ error: err.message || String(err) }));
        return true; // keep channel open for async response
    }

    if (message.type === 'searchCategories') {
        handleSearchCategories(message.query)
            .then(sendResponse)
            .catch((err) => sendResponse({ error: err.message, data: [] }));
        return true;
    }
});

// ===== Auth: Client Credentials Grant =====

async function getAccessToken() {
    const { clientId, clientSecret, accessToken, tokenExpiry } =
        await chrome.storage.local.get(['clientId', 'clientSecret', 'accessToken', 'tokenExpiry']);

    if (!clientId || !clientSecret) {
        throw new Error('Не указаны Client-ID и Client-Secret. Откройте настройки (⚙).');
    }

    // Return cached token if still valid
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return { accessToken, clientId };
    }

    // Request new token
    const resp = await fetch(TWITCH_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
        }),
    });

    if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.message || `Ошибка авторизации (${resp.status}). Проверьте Client-ID / Secret.`);
    }

    const data = await resp.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    // Cache token with a safety margin of 5 minutes
    await chrome.storage.local.set({
        accessToken: newToken,
        tokenExpiry: Date.now() + (expiresIn - 300) * 1000,
    });

    return { accessToken: newToken, clientId };
}

// ===== Twitch API Helper =====

async function twitchGet(endpoint, params = {}) {
    const { accessToken, clientId } = await getAccessToken();

    const url = new URL(`${TWITCH_API_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            url.searchParams.append(k, v);
        }
    });

    const resp = await fetch(url.toString(), {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!resp.ok) {
        if (resp.status === 401) {
            // Token expired, clear and retry once
            await chrome.storage.local.set({ accessToken: '', tokenExpiry: 0 });
            return twitchGet(endpoint, params);
        }
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.message || `Twitch API error (${resp.status})`);
    }

    return resp.json();
}

// ===== Search Categories =====

async function handleSearchCategories(query) {
    const result = await twitchGet('/search/categories', { query, first: 8 });
    return { data: result.data || [] };
}

// ===== Find Random Stream =====

async function handleFindRandomStream(filters) {
    const { language, viewerMode, viewerCount, category } = filters;

    // 1. Resolve category → game_id
    let gameId = null;
    if (category) {
        const catResult = await twitchGet('/games', { name: category });
        if (catResult.data && catResult.data.length > 0) {
            gameId = catResult.data[0].id;
        } else {
            throw new Error(`Категория «${category}» не найдена на Twitch.`);
        }
    }

    // 2. Fetch streams and collect matching ones
    const matchingStreams = [];
    let cursor = null;
    const maxPages = 15; // Safety limit

    for (let page = 0; page < maxPages; page++) {
        const params = {
            first: 100,
            type: 'live',
        };

        if (language) params.language = language;
        if (gameId) params.game_id = gameId;
        if (cursor) params.after = cursor;

        const result = await twitchGet('/streams', params);
        const streams = result.data || [];

        if (streams.length === 0) break;

        // Filter by viewer count
        for (const stream of streams) {
            const vc = stream.viewer_count;

            if (viewerMode === 'less' && vc < viewerCount) {
                matchingStreams.push(stream);
            } else if (viewerMode === 'more' && vc > viewerCount) {
                matchingStreams.push(stream);
            }
        }

        // For "less than N", the API sorts descending by viewers.
        // If the last stream on this page still has viewer_count >= threshold, keep going.
        // If we already found enough, or if all streams on this page match, we can collect more for better randomness.
        const lastStream = streams[streams.length - 1];

        if (viewerMode === 'less') {
            // If last stream viewer_count is 0, we've reached the bottom
            if (lastStream.viewer_count === 0) break;
            // If we have enough matching streams for good randomness, stop
            if (matchingStreams.length >= 50) break;
        }

        if (viewerMode === 'more') {
            // For "more than N", streams are sorted descending.
            // If last stream on page is below threshold, no more matches ahead.
            if (lastStream.viewer_count <= viewerCount) break;
        }

        cursor = result.pagination?.cursor;
        if (!cursor) break;
    }

    if (matchingStreams.length === 0) {
        throw new Error(
            `Не удалось найти стримы (${language || 'любой язык'}, ` +
            `${viewerMode === 'less' ? '<' : '>'} ${viewerCount} зрителей` +
            `${category ? ', ' + category : ''}). Попробуйте другие фильтры.`
        );
    }

    // 3. Pick a random stream
    const randomStream = matchingStreams[Math.floor(Math.random() * matchingStreams.length)];

    return {
        url: `https://www.twitch.tv/${randomStream.user_login}`,
        name: `${randomStream.user_name} (${randomStream.viewer_count} зрителей)`,
    };
}
