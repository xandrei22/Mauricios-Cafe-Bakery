const crypto = require('crypto');

function getSecret() {
    const secret = process.env.URL_SIGNING_SECRET || process.env.SESSION_SECRET || '';
    if (!secret || secret.length < 16) {
        // Fallback to a static dev secret if none provided (encourage override in env)
        return 'dev-url-signing-secret-change-me';
    }
    return secret;
}

function base64UrlEncode(buffer) {
    return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input) {
    const pad = 4 - (input.length % 4);
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + (pad === 4 ? '' : '='.repeat(pad));
    return Buffer.from(normalized, 'base64');
}

function signPayload(payloadString, secret) {
    return crypto.createHmac('sha256', secret).update(payloadString).digest();
}

function timingSafeEqualString(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

// Sign an URL's pathname and query params. Returns full URL with signature fields added.
function signUrl(fullUrl, { expiresInSeconds = 900 } = {}) {
    const secret = getSecret();
    const url = new URL(fullUrl);
    const exp = Math.floor(Date.now() / 1000) + Math.max(1, expiresInSeconds);

    // Remove any existing signature fields before signing
    url.searchParams.delete('sig');
    url.searchParams.delete('exp');

    // Compose canonical string
    const canonical = `${url.pathname}?${url.searchParams.toString()}&exp=${exp}`;
    const mac = signPayload(canonical, secret);
    const sig = base64UrlEncode(mac);

    url.searchParams.set('exp', String(exp));
    url.searchParams.set('sig', sig);
    return url.toString();
}

// Verify signature on provided path and search string against current secret
function verifySignature(pathname, search) {
    const secret = getSecret();
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const sig = params.get('sig');
    const exp = params.get('exp');
    if (!sig || !exp) return false;

    // Check expiry
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false;

    // Build canonical string without sig
    params.delete('sig');
    const canonical = `${pathname}?${params.toString()}`;
    const mac = signPayload(canonical, secret);
    const expectedSig = base64UrlEncode(mac);
    return timingSafeEqualString(sig, expectedSig);
}

module.exports = {
    signUrl,
    verifySignature,
};