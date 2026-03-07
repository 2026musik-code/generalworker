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

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return c.json(await response.json())
})

app.get('/api/cloudflare/workers', async (c) => {
  const accountId = c.req.header('X-CF-Account-ID')
  const token = c.req.header('X-CF-Token')
  if (!accountId || !token) return c.json({ error: 'Missing headers' }, 400)

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return c.json(await response.json())
})

app.get('/api/cloudflare/dns', async (c) => {
  const token = c.req.header('X-CF-Token')
  if (!token) return c.json({ error: 'Missing headers' }, 400)

  // Listing zones is the first step for DNS
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return c.json(await response.json())
})

app.get('/api/ai/chat', async (c) => {
  const apikey = c.req.query('apikey')
  const prompt = c.req.query('prompt')
  if (!apikey || !prompt) return c.json({ error: 'Missing apikey or prompt' }, 400)

  const url = new URL('https://api-v3.ahem7553.workers.dev/api/gateway/copilot')
  url.searchParams.append('apikey', apikey)
  url.searchParams.append('prompt', prompt)

  const response = await fetch(url.toString())
  const text = await response.text()
  try {
    const data = JSON.parse(text)
    if (data.status && data.result && data.result.response) {
      return c.json({ response: data.result.response })
    }
    return c.json(data)
  } catch (e) {
    return c.text(text)
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
        body { background-color: #0f172a; color: #f8fafc; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .gradient-text { background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    </style>
</head>
<body class="min-h-screen flex flex-col">
    <div id="app" class="flex-grow flex flex-col relative overflow-hidden">
        <div class="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div id="view-login" class="flex-grow flex flex-col items-center justify-center p-6 z-10">
            <div class="w-full max-w-md glass rounded-3xl p-8 shadow-2xl">
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-black gradient-text mb-2 tracking-tight">GENERAL WORKER</h1>
                    <p class="text-slate-400 text-sm">Cloudflare Management & AI Assistant</p>
                </div>

                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Cloudflare Account ID</label>
                        <input id="cf-account-id" type="text" placeholder="Enter Account ID" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Cloudflare API Token</label>
                        <input id="cf-token" type="password" placeholder="Enter API Token" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">AI API Key</label>
                        <input id="ai-key" type="password" placeholder="Enter AI API Key" class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                    </div>

                    <button onclick="handleLogin()" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 mt-4">
                        GET STARTED
                    </button>
                </div>
                <div class="mt-6 text-center">
                    <p class="text-[10px] text-slate-500 uppercase tracking-widest">Modern Executive Dashboard</p>
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
                    <div class="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                        <span class="font-bold text-sm uppercase tracking-widest text-slate-400">Cloudflare Data</span>
                        <button onclick="toggleSidebar()" class="text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="p-4 border-b border-slate-800 bg-slate-800/20">
                        <div id="cf-profile-data" class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg">CF</div>
                            <div class="flex flex-col overflow-hidden">
                                <span id="cf-account-name" class="text-xs font-bold truncate">Loading Account...</span>
                                <span id="cf-account-id-display" class="text-[10px] text-slate-500 truncate">ID: ...</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex-grow flex flex-col overflow-hidden">
                        <div class="grid grid-cols-2 h-full">
                            <div class="border-r border-slate-800 flex flex-col overflow-hidden">
                                <div class="px-3 py-2 border-b border-slate-800 bg-slate-800/10 flex items-center space-x-2">
                                    <i class="fa-solid fa-microchip text-[10px] text-blue-400"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Workers</span>
                                </div>
                                <div id="workers-list" class="flex-grow overflow-y-auto p-2 space-y-2"></div>
                            </div>
                            <div class="flex flex-col overflow-hidden">
                                <div class="px-3 py-2 border-b border-slate-800 bg-slate-800/10 flex items-center space-x-2">
                                    <i class="fa-solid fa-globe text-[10px] text-indigo-400"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">DNS Zones</span>
                                </div>
                                <div id="dns-list" class="flex-grow overflow-y-auto p-2 space-y-2"></div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 border-t border-slate-800">
                        <button onclick="logout()" class="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold hover:bg-red-500/20 transition-all">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>LOGOUT</span>
                        </button>
                    </div>
                </aside>

                <div id="sidebar-backdrop" onclick="toggleSidebar()" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 hidden"></div>

                <section class="flex-grow flex flex-col bg-slate-950/30 relative overflow-hidden">
                    <div id="chat-messages" class="flex-grow overflow-y-auto p-6 space-y-6">
                        <div class="flex justify-start">
                            <div class="max-w-[85%] glass rounded-2xl rounded-tl-none p-4 text-sm leading-relaxed">
                                Hello! I'm your General Worker AI assistant. How can I help you today?
                            </div>
                        </div>
                    </div>

                    <div class="p-4 border-t border-slate-800 glass">
                        <div class="flex items-center space-x-2">
                            <input id="chat-input" type="text" placeholder="Type a message..." class="flex-grow bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                            <button onclick="sendMessage()" class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>

        <div id="modal-settings" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div class="w-full max-w-sm glass rounded-3xl p-6 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Settings</h2>
                    <button onclick="toggleSettings()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="space-y-4">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500">Account ID</label>
                        <input id="set-cf-account-id" type="text" class="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500">API Token</label>
                        <input id="set-cf-token" type="password" class="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase text-slate-500">AI Key</label>
                        <input id="set-ai-key" type="password" class="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-sm">
                    </div>
                    <button onclick="saveSettings()" class="w-full bg-blue-600 py-3 rounded-xl font-bold mt-4">Save Changes</button>
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

            if (state.cfAccountId && state.cfToken && state.aiKey) {
                showDashboard();
            } else {
                showLogin();
            }
        }

        async function syncFromR2(key) {
            try {
                const res = await fetch("/api/config?user=default&key=" + key);
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
                    await fetch("/api/config?user=default&key=" + masterKey, {
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
            const masterKey = prompt("Masukkan Master Key untuk simpan ke R2:");

            if (!state.cfAccountId || !state.cfToken || !state.aiKey) {
                alert('Please fill all fields');
                return;
            }

            localStorage.setItem('cfAccountId', state.cfAccountId);
            localStorage.setItem('cfToken', state.cfToken);
            localStorage.setItem('aiKey', state.aiKey);
            if (masterKey) localStorage.setItem('masterKey', masterKey);

            if (masterKey) {
                try {
                    await fetch("/api/config?user=default&key=" + masterKey, {
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
                content.innerHTML = state.workers.length ? '' : '<p class="text-center text-slate-500 text-[8px] py-4">None</p>';
                state.workers.forEach(w => {
                    const item = document.createElement('div');
                    item.className = 'p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 flex flex-col';
                    item.innerHTML = "<span class='text-[9px] font-bold truncate'>" + w.id + "</span><span class='text-[7px] text-slate-500 uppercase'>" + (w.usage_model || 'std') + "</span>";
                    content.appendChild(item);
                });
            } catch (e) {
                content.innerHTML = '<p class="text-center text-red-400 text-[8px] py-4">Error</p>';
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
                content.innerHTML = state.dns.length ? '' : '<p class="text-center text-slate-500 text-[8px] py-4">None</p>';
                state.dns.forEach(z => {
                    const item = document.createElement('div');
                    item.className = 'p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 flex flex-col';
                    item.innerHTML = "<span class='text-[9px] font-bold truncate'>" + z.name + "</span><span class='text-[7px] text-green-400 uppercase'>" + z.status + "</span>";
                    content.appendChild(item);
                });
            } catch (e) {
                content.innerHTML = '<p class="text-center text-red-400 text-[8px] py-4">Error</p>';
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
                const res = await fetch("/api/ai/chat?apikey=" + state.aiKey + "&prompt=" + encodeURIComponent(promptStr));
                const data = await res.json();
                const responseText = data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
                updateMessage(loadingId, responseText);
            } catch (e) {
                updateMessage(loadingId, 'Kesalahan: Gagal mendapatkan respons dari AI.');
            }
        }

        function appendMessage(role, text, id = null) {
            const container = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = "flex " + (role === 'user' ? 'justify-end' : 'justify-start');
            if (id) div.id = id;
            div.innerHTML = "<div class='max-w-[85%] " + (role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'glass rounded-tl-none') + " rounded-2xl p-4 text-sm leading-relaxed shadow-lg'>" + text + "</div>";
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
