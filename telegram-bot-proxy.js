// Telegram Bot API base URL
const TELEGRAM_API_BASE = 'https://api.telegram.org';

// HTML template for documentation
const DOC_HTML = `<!DOCTYPE html>
<html>
<head>
    <title>Telegram Bot API Proxy Documentation</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #0088cc; }
        .code {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            overflow-x: auto;
        }
        .note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .example {
            background: #e7f5ff;
            border-left: 4px solid #0088cc;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Telegram Bot API Proxy</h1>
    <p>This service acts as a transparent proxy for the Telegram Bot API. It allows you to bypass network restrictions and create middleware for your Telegram bot applications.</p>
    
    <h2>How to Use</h2>
    <p>Replace <code>api.telegram.org</code> with this worker's URL in your API calls.</p>
    
    <div class="example">
        <h3>Example Usage:</h3>
        <p>Original Telegram API URL:</p>
        <div class="code">https://api.telegram.org/bot{YOUR_BOT_TOKEN}/sendMessage</div>
        <p>Using this proxy:</p>
        <div class="code">https://{YOUR_WORKER_URL}/bot{YOUR_BOT_TOKEN}/sendMessage</div>
    </div>

    <h2>Features</h2>
    <ul>
        <li>Supports all Telegram Bot API methods</li>
        <li>Handles both GET and POST requests</li>
        <li>Full CORS support for browser-based applications</li>
        <li>Transparent proxying of responses</li>
        <li>Maintains original status codes and headers</li>
    </ul>

    <div class="note">
        <strong>Note:</strong> This proxy does not store or modify your bot tokens. All requests are forwarded directly to Telegram's API servers.
    </div>
</body>
</html>`;

async function handleRequest(request) {
	const url = new URL(request.url);

	if (url.pathname === '/' || url.pathname === '') {
		return new Response(DOC_HTML, {
			headers: {
				'Content-Type': 'text/html;charset=UTF-8',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	}

	const pathParts = url.pathname.split('/').filter(Boolean);
	if (pathParts.length < 2 || !pathParts[0].startsWith('bot')) {
		return new Response('Invalid bot request format', {
			status: 400
		});
	}

	const telegramUrl = new URL(`${TELEGRAM_API_BASE}${url.pathname}${url.search}`);

	// Lọc header tránh lỗi
	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (!['host', 'content-length', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor'].includes(key.toLowerCase())) {
			headers.set(key, value);
		}
	}

	const telegramRequest = new Request(telegramUrl, {
		method: request.method,
		headers: headers,
		body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : undefined,
		redirect: 'follow',
	});

	try {
		const response = await fetch(telegramRequest);
		const body = await response.arrayBuffer();

		const newResponse = new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});

		newResponse.headers.set('Access-Control-Allow-Origin', '*');
		newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

		return newResponse;
	} catch (error) {
		return new Response(`Error proxying request: ${error.message}`, {
			status: 500
		});
	}
}

// Handle OPTIONS requests for CORS
function handleOptions(request) {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};

	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

// Main event listener for the worker
addEventListener('fetch', event => {
	const request = event.request;

	// Handle CORS preflight requests
	if (request.method === 'OPTIONS') {
		event.respondWith(handleOptions(request));
	} else {
		event.respondWith(handleRequest(request));
	}
});
