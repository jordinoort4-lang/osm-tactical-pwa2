import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// === YOUR SUPABASE DETAILS (already filled in) ===
const SUPABASE_URL = 'https://nsyizygivxghkerkxztx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeWl6eWdpdnhnaGtlcmt4enR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDM3OTksImV4cCI6MjA4NzIxOTc5OX0.WDqNdZ9zJhhaeWgnKC745kMwdbr0a1gneP0CuWJJXkg'
// ================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let currentEntry = null

// Screen helpers
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden')
  document.getElementById('dashboard-screen').classList.add('hidden')
}
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('dashboard-screen').classList.remove('hidden')
  document.getElementById('user-email').textContent = currentUser.email
  loadData()
}

// Auth buttons
document.getElementById('signin-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  if (!email || !password) return alert('Enter email and password')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) alert(error.message)
})

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  if (!email || password.length < 6) return alert('Email + password min 6 chars')
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) alert(error.message)
  else alert('Account created! You are now signed in.')
})

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut()
})

// Clock button
document.getElementById('clock-btn').addEventListener('click', toggleClock)

async function toggleClock() {
  if (!currentUser) return
  if (currentEntry) {
    // Clock OUT
    const { error } = await supabase
      .from('time_entries')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', currentEntry.id)
    if (error) alert(error.message)
  } else {
    // Clock IN
    const { error } = await supabase
      .from('time_entries')
      .insert({ user_id: currentUser.id, clock_in: new Date().toISOString() })
    if (error) alert(error.message)
  }
  loadData()
}

async function loadData() {
  await Promise.all([loadStatus(), loadHistory()])
}

async function loadStatus() {
  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle()

  currentEntry = data
  const statusEl = document.getElementById('status')
  const btn = document.getElementById('clock-btn')

  if (data) {
    const time = new Date(data.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    statusEl.innerHTML = `Clocked in since <span class="font-bold">${time}</span>`
    btn.textContent = 'CLOCK OUT'
    btn.classList.remove('bg-green-600', 'hover:bg-green-700')
    btn.classList.add('bg-red-600', 'hover:bg-red-700')
  } else {
    statusEl.textContent = 'Not clocked in'
    btn.textContent = 'CLOCK IN'
    btn.classList.remove('bg-red-600', 'hover:bg-red-700')
    btn.classList.add('bg-green-600', 'hover:bg-green-700')
  }
}

async function loadHistory() {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('clock_in', { ascending: false })

  if (error) return alert(error.message)

  const tbody = document.querySelector('#history tbody')
  tbody.innerHTML = ''
  let todayTotal = 0
  const todayStr = new Date().toISOString().split('T')[0]

  data.forEach(entry => {
    let duration = 0
    let outTime = 'Open'
    const inDate = new Date(entry.clock_in)
    const inTime = inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateStr = inDate.toLocaleDateString()

    if (entry.clock_out) {
      const outDate = new Date(entry.clock_out)
      duration = (outDate - inDate) / 3600000
      outTime = outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      duration = (Date.now() - inDate) / 3600000
      outTime = 'Now'
    }

    if (entry.clock_in.split('T')[0] === todayStr) todayTotal += duration

    const row = document.createElement('tr')
    row.className = 'hover:bg-gray-50'
    row.innerHTML = `
      <td class="px-6 py-4 text-sm">${dateStr}</td>
      <td class="px-6 py-4 text-sm">${inTime}</td>
      <td class="px-6 py-4 text-sm">${outTime}</td>
      <td class="px-6 py-4 text-sm text-right font-medium">${duration.toFixed(2)}</td>
    `
    tbody.appendChild(row)
  })

  document.getElementById('today-hours').textContent = todayTotal.toFixed(2)
}

// Auth listener + init
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    currentUser = session.user
    showDashboard()
  } else {
    currentUser = null
    showLogin()
  }
})

async function init() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentUser = session.user
    showDashboard()
  } else {
    showLogin()
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
  }
}

init()