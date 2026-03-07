import { Hono } from 'hono'
import { html } from 'hono/html'

type Bindings = {
  R2: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/api/config', async (c) => {
  const userId = c.req.query('user') || 'default'
  const key = c.req.query('key')
  if (!key) return c.json({ error: 'Unauthorized' }, 401)

  const config = await c.env.R2.get(`config_${userId}_${key}`)
  if (!config) return c.json({ error: 'Not found' }, 404)
  return c.json(await config.json())
})

app.post('/api/config', async (c) => {
  const userId = c.req.query('user') || 'default'
  const key = c.req.query('key')
  if (!key) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  await c.env.R2.put(`config_${userId}_${key}`, JSON.stringify(body))
  return c.json({ success: true })
})

app.get('/api/cloudflare/account', async (c) => {
  const accountId = c.req.header('X-CF-Account-ID')
  const token = c.req.header('X-CF-Token')
  if (!accountId || !token) return c.json({ error: 'Missing headers' }, 400)

  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + accountId, {
    headers: { 'Authorization': "Bearer " + token }
  })
  return c.json(await response.json())
})

app.get('/api/cloudflare/workers', async (c) => {
  const accountId = c.req.header('X-CF-Account-ID')
  const token = c.req.header('X-CF-Token')
  if (!accountId || !token) return c.json({ error: 'Missing headers' }, 400)

  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + accountId + "/workers/scripts", {
    headers: { 'Authorization': "Bearer " + token }
  })
  return c.json(await response.json())
})

app.get('/api/cloudflare/dns', async (c) => {
  const token = c.req.header('X-CF-Token')
  if (!token) return c.json({ error: 'Missing headers' }, 400)

  const response = await fetch("https://api.cloudflare.com/client/v4/zones", {
    headers: { 'Authorization': "Bearer " + token }
  })
  return c.json(await response.json())
})

app.get('/api/ai/chat', async (c) => {
  const prompt = c.req.query('prompt')
  if (!prompt) return c.json({ error: 'Missing prompt' }, 400)

  const url = new URL('https://magma-api.biz.id/ai/gpt5')
  url.searchParams.append('prompt', prompt)

  try {
    const response = await fetch(url.toString())
    const text = await response.text()

    if (!response.ok) {
        try {
            const errJson = JSON.parse(text);
            return c.json({ error: errJson.error || ("Error " + response.status) }, response.status as any)
        } catch (e) {
            return c.json({ error: "API Error " + response.status }, response.status as any)
        }
    }

    try {
        const data = JSON.parse(text)
        if (data.status && data.result && data.result.response) {
            return c.json({ response: data.result.response })
        }
        return c.json(data)
    } catch (e) {
        return c.json({ response: text })
    }
  } catch (e: any) {
    return c.json({ error: e.message || 'Internal Server Error' }, 500)
  }
})

app.get('/', (c) => {
  return c.html(
    html`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GENERAL WORKER</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .gradient-text { background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    </style>
</head>
<body class="min-h-screen flex flex-col">
    <div id="app" class="flex-grow flex flex-col relative overflow-hidden">
        <div class="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div id="view-login" class="flex-grow flex flex-col items-center justify-center p-6 z-10">
            <div class="w-full max-w-md glass rounded-3xl p-8 shadow-2xl">
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-black gradient-text mb-2 tracking-tight">GENERAL WORKER</h1>
                    <p class="text-slate-400 text-sm">Cloudflare Management & AI Assistant</p>
                </div>

                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Cloudflare Account ID</label>
                        <input id="cf-account-id" type="text" placeholder="Enter Account ID" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Cloudflare API Token</label>
                        <input id="cf-token" type="password" placeholder="Enter API Token" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">AI API Key (Opsional)</label>
                        <input id="ai-key" type="password" placeholder="Opsional" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm">
                    </div>

                    <button onclick="handleLogin()" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 mt-4">
                        GET STARTED
                    </button>
                </div>
            </div>
        </div>

        <div id="view-dashboard" class="hidden flex-grow flex flex-col h-screen overflow-hidden z-10">
            <header class="h-16 flex items-center justify-between px-4 border-b border-slate-800 glass z-30">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <i class="fa-solid fa-bolt text-xs"></i>
                    </div>
                    <span class="font-black text-sm tracking-tight gradient-text">GW</span>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleSettings()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors">
                        <i class="fa-solid fa-sliders text-slate-400 text-sm"></i>
                    </button>
                    <button onclick="toggleSidebar()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors">
                        <i class="fa-solid fa-bars text-slate-400 text-sm"></i>
                    </button>
                </div>
            </header>

            <main class="flex-grow flex relative overflow-hidden">
                <aside id="sidebar" class="fixed inset-y-0 left-0 w-80 glass z-40 transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800">
                    <div class="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/20">
                        <span class="font-black text-xs uppercase tracking-widest text-slate-400">DASHBOARD</span>
                        <button onclick="toggleSidebar()" class="text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="p-6 border-b border-slate-800 bg-slate-800/20">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-bold shadow-lg">CF</div>
                            <div class="flex flex-col overflow-hidden">
                                <span id="cf-account-name" class="text-sm font-bold truncate">Loading...</span>
                                <span id="cf-account-id-display" class="text-[10px] text-slate-500 truncate">ID: ...</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex-grow flex flex-col overflow-hidden">
                        <div class="grid grid-cols-2 h-full">
                            <div class="border-r border-slate-800 flex flex-col overflow-hidden">
                                <div class="px-4 py-3 border-b border-slate-800 bg-slate-800/10 flex items-center space-x-2">
                                    <i class="fa-solid fa-microchip text-[10px] text-blue-400"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Workers</span>
                                </div>
                                <div id="workers-list" class="flex-grow overflow-y-auto p-3 space-y-3"></div>
                            </div>
                            <div class="flex flex-col overflow-hidden">
                                <div class="px-4 py-3 border-b border-slate-800 bg-slate-800/10 flex items-center space-x-2">
                                    <i class="fa-solid fa-globe text-[10px] text-indigo-400"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">DNS Zones</span>
                                </div>
                                <div id="dns-list" class="flex-grow overflow-y-auto p-3 space-y-3"></div>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 border-t border-slate-800">
                        <button onclick="logout()" class="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-red-500/10 text-red-500 text-xs font-black tracking-widest hover:bg-red-500/20 transition-all">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>LOGOUT</span>
                        </button>
                    </div>
                </aside>

                <div id="sidebar-backdrop" onclick="toggleSidebar()" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 hidden transition-opacity duration-300"></div>

                <section class="flex-grow flex flex-col bg-slate-950/30 relative overflow-hidden">
                    <div id="chat-messages" class="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth">
                        <div class="flex justify-start">
                            <div class="max-w-[85%] glass rounded-2xl rounded-tl-none p-4 text-sm leading-relaxed shadow-lg">
                                Hello! I'm your General Worker AI assistant. How can I help you today?
                            </div>
                        </div>
                    </div>

                    <div class="p-4 border-t border-slate-800 glass relative z-10">
                        <div class="flex items-center space-x-2">
                            <input id="chat-input" type="text" placeholder="Type a message..." class="flex-grow bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                            <button onclick="sendMessage()" class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-white">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>

        <!-- Settings Modal -->
        <div id="modal-settings" class="hidden fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div class="w-full max-w-sm glass rounded-3xl p-8 shadow-2xl">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-xl font-bold">Settings</h2>
                    <button onclick="toggleSettings()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="space-y-5">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Account ID</label>
                        <input id="set-cf-account-id" type="text" class="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">API Token</label>
                        <input id="set-cf-token" type="password" class="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">AI Key (Opsional)</label>
                        <input id="set-ai-key" type="password" placeholder="Opsional" class="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm">
                    </div>
                    <button onclick="saveSettings()" class="w-full bg-blue-600 py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Save Changes</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const state = {
            cfAccountId: localStorage.getItem('cfAccountId') || '',
            cfToken: localStorage.getItem('cfToken') || '',
            aiKey: localStorage.getItem('aiKey') || '',
            account: null,
            workers: [],
            dns: [],
            sidebarOpen: false
        };

        async function init() {
            if (!state.cfAccountId) {
                const masterKey = prompt("Masukkan Master Key untuk mengambil data dari R2:");
                if (masterKey) {
                    localStorage.setItem('masterKey', masterKey);
                    await syncFromR2(masterKey);
                }
            } else if (localStorage.getItem('masterKey')) {
                await syncFromR2(localStorage.getItem('masterKey'));
            }

            if (state.cfAccountId && state.cfToken) {
                showDashboard();
            } else {
                showLogin();
            }
        }

        async function syncFromR2(key) {
            try {
                const res = await fetch("/api/config?user=default&key=" + encodeURIComponent(key));
                if (res.ok) {
                    const config = await res.json();
                    state.cfAccountId = config.cfAccountId;
                    state.cfToken = config.cfToken;
                    state.aiKey = config.aiKey;
                    localStorage.setItem('cfAccountId', state.cfAccountId);
                    localStorage.setItem('cfToken', state.cfToken);
                    localStorage.setItem('aiKey', state.aiKey);
                }
            } catch (e) {}
        }

        function showLogin() {
            document.getElementById('view-login').classList.remove('hidden');
            document.getElementById('view-dashboard').classList.add('hidden');
        }

        async function showDashboard() {
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-dashboard').classList.remove('hidden');
            document.getElementById('set-cf-account-id').value = state.cfAccountId;
            document.getElementById('set-cf-token').value = state.cfToken;
            document.getElementById('set-ai-key').value = state.aiKey;
            await loadData();
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }

        function toggleSidebar() {
            state.sidebarOpen = !state.sidebarOpen;
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (state.sidebarOpen) {
                sidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            }
        }

        function toggleSettings() {
            document.getElementById('modal-settings').classList.toggle('hidden');
        }

        async function saveSettings() {
            state.cfAccountId = document.getElementById('set-cf-account-id').value;
            state.cfToken = document.getElementById('set-cf-token').value;
            state.aiKey = document.getElementById('set-ai-key').value;
            const masterKey = localStorage.getItem('masterKey') || prompt("Masukkan Master Key untuk simpan ke R2:");

            localStorage.setItem('cfAccountId', state.cfAccountId);
            localStorage.setItem('cfToken', state.cfToken);
            localStorage.setItem('aiKey', state.aiKey);
            if (masterKey) localStorage.setItem('masterKey', masterKey);

            if (masterKey) {
                try {
                    await fetch("/api/config?user=default&key=" + encodeURIComponent(masterKey), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cfAccountId: state.cfAccountId,
                            cfToken: state.cfToken,
                            aiKey: state.aiKey
                        })
                    });
                } catch (e) {}
            }
            toggleSettings();
            loadData();
        }

        async function handleLogin() {
            state.cfAccountId = document.getElementById('cf-account-id').value;
            state.cfToken = document.getElementById('cf-token').value;
            state.aiKey = document.getElementById('ai-key').value;

            if (!state.cfAccountId || !state.cfToken) {
                alert('Please fill Cloudflare fields');
                return;
            }

            const masterKey = prompt("Buat Master Key untuk simpan ke R2 (opsional, cancel jika tidak mau):");

            localStorage.setItem('cfAccountId', state.cfAccountId);
            localStorage.setItem('cfToken', state.cfToken);
            localStorage.setItem('aiKey', state.aiKey);
            if (masterKey) {
                localStorage.setItem('masterKey', masterKey);
                try {
                    await fetch("/api/config?user=default&key=" + encodeURIComponent(masterKey), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cfAccountId: state.cfAccountId,
                            cfToken: state.cfToken,
                            aiKey: state.aiKey
                        })
                    });
                } catch (e) {}
            }
            showDashboard();
        }

        async function loadData() {
            try {
                const accRes = await fetch('/api/cloudflare/account', {
                    headers: { 'X-CF-Account-ID': state.cfAccountId, 'X-CF-Token': state.cfToken }
                });
                const accData = await accRes.json();
                if (accData.result) {
                    state.account = accData.result;
                    document.getElementById('cf-account-name').textContent = state.account.name;
                    document.getElementById('cf-account-id-display').textContent = 'ID: ' + state.account.id;
                }
            } catch (e) {}
            await Promise.all([loadWorkers(), loadDNS()]);
        }

        async function loadWorkers() {
            const content = document.getElementById('workers-list');
            content.innerHTML = '<div class="flex justify-center py-4"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div></div>';
            try {
                const res = await fetch('/api/cloudflare/workers', {
                    headers: { 'X-CF-Account-ID': state.cfAccountId, 'X-CF-Token': state.cfToken }
                });
                const data = await res.json();
                state.workers = data.result || [];
                content.innerHTML = state.workers.length ? '' : '<p class="text-center text-slate-500 text-[8px] py-4 uppercase font-bold tracking-tighter">None</p>';
                state.workers.forEach(w => {
                    const item = document.createElement('div');
                    item.className = 'p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30 flex flex-col hover:bg-slate-800/60 transition-colors cursor-default';
                    item.innerHTML = "<span class='text-[10px] font-bold truncate text-slate-200'>" + w.id + "</span><span class='text-[8px] text-slate-500 uppercase font-black tracking-widest'>" + (w.usage_model || 'std') + "</span>";
                    content.appendChild(item);
                });
            } catch (e) {
                content.innerHTML = '<p class="text-center text-red-400 text-[8px] py-4 uppercase font-bold">Error</p>';
            }
        }

        async function loadDNS() {
            const content = document.getElementById('dns-list');
            content.innerHTML = '<div class="flex justify-center py-4"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div></div>';
            try {
                const res = await fetch('/api/cloudflare/dns', {
                    headers: { 'X-CF-Token': state.cfToken }
                });
                const data = await res.json();
                state.dns = data.result || [];
                content.innerHTML = state.dns.length ? '' : '<p class="text-center text-slate-500 text-[8px] py-4 uppercase font-bold tracking-tighter">None</p>';
                state.dns.forEach(z => {
                    const item = document.createElement('div');
                    item.className = 'p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30 flex flex-col hover:bg-slate-800/60 transition-colors cursor-default';
                    item.innerHTML = "<span class='text-[10px] font-bold truncate text-slate-200'>" + z.name + "</span><span class='text-[8px] text-green-500/80 uppercase font-black tracking-widest'>" + z.status + "</span>";
                    content.appendChild(item);
                });
            } catch (e) {
                content.innerHTML = '<p class="text-center text-red-400 text-[8px] py-4 uppercase font-bold">Error</p>';
            }
        }

        async function sendMessage() {
            const input = document.getElementById('chat-input');
            const promptStr = input.value.trim();
            if (!promptStr) return;
            input.value = '';
            appendMessage('user', promptStr);
            const loadingId = 'loading-' + Date.now();
            appendMessage('ai', 'Thinking...', loadingId);
            try {
                const res = await fetch("/api/ai/chat?prompt=" + encodeURIComponent(promptStr));
                const data = await res.json().catch(() => ({ error: 'Gagal memproses data AI.' }));

                if (!res.ok) {
                    throw new Error(data.error || "Gagal mendapatkan respon dari AI.");
                }

                const responseText = data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
                updateMessage(loadingId, responseText);
            } catch (e) {
                console.error(e);
                updateMessage(loadingId, 'Kesalahan: ' + (e.message || 'Gagal mendapatkan respon dari AI.'));
            }
        }

        function appendMessage(role, text, id = null) {
            const container = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = "flex " + (role === 'user' ? 'justify-end' : 'justify-start');
            if (id) div.id = id;
            div.innerHTML = "<div class='max-w-[85%] " + (role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'glass rounded-tl-none') + " rounded-2xl p-4 text-sm leading-relaxed shadow-lg shadow-black/20'>" + text + "</div>";
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function updateMessage(id, text) {
            const div = document.getElementById(id);
            if (div) {
                div.querySelector('div').textContent = text;
                const container = document.getElementById('chat-messages');
                container.scrollTop = container.scrollHeight;
            }
        }

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        init();
    </script>
</body>
</html>`
  )
})

export default app
