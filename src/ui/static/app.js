// --- State ---
let patients = []
let selectedPatient = null
let eventSource = null

const STATUS_LABELS = {
  absent: 'fehlend',
  carious: 'kariös',
  'crown-intact': 'Krone ok',
  'crown-needs-renewal': 'Krone erneuerungsbed.',
  'bridge-anchor': 'Brückenanker',
  'replaced-bridge': 'Brückenglied',
  implant: 'Implantat',
  'implant-with-crown': 'Implantat+Krone',
  filled: 'Füllung',
}

// --- Patient loading ---
async function loadPatients() {
  const select = document.getElementById('patient-select')
  try {
    const res = await fetch('/api/patients')
    const data = await res.json()
    patients = data.patients || []

    select.innerHTML = '<option value="">— Patient wählen —</option>'
    for (const p of patients) {
      const opt = document.createElement('option')
      opt.value = p.id
      const badge = p.coverageType === 'PKV' ? '[PKV]' : '[GKV]'
      opt.textContent = `${p.name} ${badge} — ${p.findingsCount} Befunde`
      select.appendChild(opt)
    }
  } catch (err) {
    select.innerHTML = '<option value="">Fehler beim Laden</option>'
    console.error('Failed to load patients:', err)
  }
}

function onPatientSelect() {
  const id = document.getElementById('patient-select').value
  selectedPatient = patients.find(p => p.id === id) || null

  const infoEl = document.getElementById('patient-info')
  const findingsSection = document.getElementById('findings-section')
  const suggestBtn = document.getElementById('suggest-btn')

  if (!selectedPatient) {
    infoEl.classList.add('hidden')
    findingsSection.classList.add('hidden')
    suggestBtn.disabled = true
    clearBillingItems()
    return
  }

  // Patient info card
  const age = selectedPatient.birthDate
    ? Math.floor((Date.now() - new Date(selectedPatient.birthDate).getTime()) / 31557600000)
    : '?'

  infoEl.innerHTML = `
    <div class="info-item">
      <span class="info-label">Name</span>
      <span class="info-value">${selectedPatient.name}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Alter</span>
      <span class="info-value">${age} Jahre</span>
    </div>
    <div class="info-item">
      <span class="info-label">Versicherung</span>
      <span class="info-value"><span class="badge ${selectedPatient.coverageType.toLowerCase()}">${selectedPatient.coverageType}</span></span>
    </div>
    ${selectedPatient.bonusPercent > 0 ? `
    <div class="info-item">
      <span class="info-label">Bonus</span>
      <span class="info-value">${selectedPatient.bonusPercent}%</span>
    </div>` : ''}
    <div class="info-item">
      <span class="info-label">Befunde</span>
      <span class="info-value">${selectedPatient.findingsCount}</span>
    </div>
  `
  infoEl.classList.remove('hidden')

  // Findings
  renderFindings(selectedPatient.findings)
  findingsSection.classList.remove('hidden')

  // Enable suggestions & auto-load
  suggestBtn.disabled = false
  loadSuggestions()
}

function renderFindings(findings) {
  const el = document.getElementById('findings-list')
  if (!findings || findings.length === 0) {
    el.innerHTML = '<span style="font-size:0.8rem;color:#718096">Keine Befunde vorhanden</span>'
    return
  }

  const sorted = [...findings].sort((a, b) => a.tooth - b.tooth)

  el.innerHTML = sorted.map(f => {
    const label = STATUS_LABELS[f.status] || f.status
    const surfaces = f.surfaces?.length ? ` (${f.surfaces.join(',')})` : ''
    return `<div class="finding-chip ${f.status}" title="${label}${surfaces}">
      <span class="tooth-num">${f.tooth}</span>
      <span>${label}${surfaces}</span>
    </div>`
  }).join('')

  const usedStatuses = [...new Set(sorted.map(f => f.status))]
  const legendColors = {
    absent: '#fed7d7', carious: '#fefcbf', 'crown-needs-renewal': '#feebc8',
    'crown-intact': '#c6f6d5', 'bridge-anchor': '#e9d8fd', 'replaced-bridge': '#fed7e2',
    implant: '#bee3f8', 'implant-with-crown': '#bee3f8', filled: '#c6f6d5',
  }
  el.innerHTML += `<div class="findings-legend">${usedStatuses.map(s =>
    `<span><span class="legend-dot" style="background:${legendColors[s] || '#edf2f7'}"></span>${STATUS_LABELS[s] || s}</span>`
  ).join('')}</div>`
}

// --- Billing items ---
function clearBillingItems() {
  document.getElementById('billing-items').innerHTML = ''
  document.getElementById('suggestions-hint').classList.add('hidden')
}

async function loadSuggestions() {
  if (!selectedPatient) return

  const container = document.getElementById('billing-items')
  const hint = document.getElementById('suggestions-hint')
  container.innerHTML = '<div style="font-size:0.8rem;color:#718096;padding:0.5rem">Vorschläge werden geladen...</div>'

  try {
    const res = await fetch(`/api/patients/${selectedPatient.id}/suggestions`)
    const data = await res.json()

    if (!data.suggestions || data.suggestions.length === 0) {
      container.innerHTML = ''
      hint.textContent = 'Keine Vorschläge basierend auf den Befunden.'
      hint.classList.remove('hidden')
      addBillingRow() // add one empty row
      return
    }

    hint.textContent = `${data.suggestions.length} Positionen aus ${data.patterns} Mustern vorgeschlagen. Positionen an-/abwählen und Faktor anpassen.`
    hint.classList.remove('hidden')

    // Group by pattern
    const groups = new Map()
    for (const s of data.suggestions) {
      if (!groups.has(s.patternId)) {
        groups.set(s.patternId, { name: s.patternName, items: [] })
      }
      groups.get(s.patternId).items.push(s)
    }

    container.innerHTML = ''
    for (const [patternId, group] of groups) {
      const groupEl = document.createElement('div')
      groupEl.className = 'pattern-group'
      groupEl.innerHTML = `<div class="pattern-group-header">
        ${group.name}
        <span class="pattern-badge">${patternId}</span>
      </div>`

      for (const s of group.items) {
        const row = createSuggestionRow(s)
        groupEl.appendChild(row)
      }
      container.appendChild(groupEl)
    }
  } catch (err) {
    container.innerHTML = ''
    hint.textContent = `Fehler beim Laden: ${err.message}`
    hint.classList.remove('hidden')
    addBillingRow()
  }
}

function createSuggestionRow(suggestion) {
  const row = document.createElement('div')
  const optionalClass = suggestion.isRequired ? '' : ' optional'
  row.className = `billing-row suggested${optionalClass}`

  const teethStr = suggestion.teeth?.length ? suggestion.teeth.join(',') : ''
  const checked = suggestion.isRequired ? 'checked' : ''
  const desc = suggestion.description || ''
  const reqLabel = suggestion.isRequired ? '' : ' (optional)'

  row.innerHTML = `
    <input type="checkbox" class="item-toggle" ${checked}>
    <select class="item-system"><option ${suggestion.system === 'GOZ' ? 'selected' : ''}>GOZ</option><option ${suggestion.system === 'BEMA' ? 'selected' : ''}>BEMA</option></select>
    <input type="text" class="item-code" value="${suggestion.code}" readonly>
    <input type="number" class="item-multiplier" placeholder="Faktor" step="0.1" min="1" ${suggestion.system === 'GOZ' ? 'value="2.3"' : ''}>
    <input type="text" class="item-teeth" value="${teethStr}" placeholder="Zähne">
    <span class="item-desc" title="${desc}${reqLabel}">${desc}${reqLabel}</span>
    <button class="btn-remove" onclick="this.closest('.billing-row').remove()">×</button>
  `
  return row
}

function addBillingRow() {
  const container = document.getElementById('billing-items')
  const row = document.createElement('div')
  row.className = 'billing-row'
  row.innerHTML = `
    <input type="checkbox" class="item-toggle" checked>
    <select class="item-system"><option>GOZ</option><option>BEMA</option></select>
    <input type="text" class="item-code" placeholder="Code">
    <input type="number" class="item-multiplier" placeholder="Faktor" step="0.1" min="1">
    <input type="text" class="item-teeth" placeholder="Zähne (z.B. 16,17)">
    <span class="item-desc"></span>
    <button class="btn-remove" onclick="this.closest('.billing-row').remove()">×</button>
  `
  container.appendChild(row)
}

function collectBillingItems() {
  const rows = document.querySelectorAll('.billing-row')
  const items = []
  for (const row of rows) {
    // Skip unchecked rows
    const toggle = row.querySelector('.item-toggle')
    if (toggle && !toggle.checked) continue

    const code = row.querySelector('.item-code').value.trim()
    if (!code) continue
    const system = row.querySelector('.item-system').value
    const multiplier = parseFloat(row.querySelector('.item-multiplier').value) || undefined
    const teethStr = row.querySelector('.item-teeth').value.trim()
    const teeth = teethStr ? teethStr.split(',').map(t => parseInt(t.trim())).filter(Boolean) : undefined
    items.push({ code, system, multiplier, teeth })
  }
  return items
}

// --- Cost Calculation ---
async function calculateCosts() {
  const billingItems = collectBillingItems()
  if (billingItems.length === 0) { alert('Keine Abrechnungspositionen ausgewählt'); return }

  const kassenart = document.getElementById('kassenart-select').value || undefined
  const festzuschussBefund = document.getElementById('festzuschuss-input').value.trim() || undefined
  const bonusTier = document.getElementById('bonus-select').value || undefined

  const btn = document.getElementById('calculate-btn')
  btn.disabled = true
  btn.textContent = 'Berechne...'

  try {
    const res = await fetch('/api/billing/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: billingItems.map(it => ({
          code: it.code,
          system: it.system,
          factor: it.multiplier,
          kassenart,
        })),
        festzuschussBefund,
        bonusTier,
        kassenart,
      }),
    })
    const data = await res.json()
    renderCostSummary(data)
    updateRowPrices(data.breakdown)
  } catch (err) {
    alert(`Fehler: ${err.message}`)
  } finally {
    btn.disabled = false
    btn.textContent = 'Kosten berechnen'
  }
}

function renderCostSummary(data) {
  const el = document.getElementById('cost-summary')
  el.classList.remove('hidden')
  el.replaceChildren()

  const h3 = document.createElement('h3')
  h3.textContent = 'Kostenkalkulation'
  el.appendChild(h3)

  const totals = document.createElement('div')
  totals.className = 'cost-totals'

  function addTotalCard(amount, label, extraClass) {
    const card = document.createElement('div')
    card.className = 'cost-total-item'
    const amountEl = document.createElement('div')
    amountEl.className = 'amount' + (extraClass ? ' ' + extraClass : '')
    amountEl.textContent = amount.toFixed(2) + '\u20AC'
    const labelEl = document.createElement('div')
    labelEl.className = 'label'
    labelEl.textContent = label
    card.appendChild(amountEl)
    card.appendChild(labelEl)
    totals.appendChild(card)
  }

  addTotalCard(data.totalCost, 'Gesamtkosten', '')
  if (data.festzuschuss > 0) {
    addTotalCard(data.festzuschuss, 'Festzuschuss', 'zuschuss')
    addTotalCard(data.patientShare, 'Eigenanteil', 'patient')
  }
  el.appendChild(totals)

  if (data.festzuschussError) {
    const errEl = document.createElement('div')
    errEl.style.cssText = 'font-size:0.8rem;color:#e53e3e;margin-bottom:0.5rem'
    errEl.textContent = 'Festzuschuss-Fehler: ' + data.festzuschussError
    el.appendChild(errEl)
  }

  const bdContainer = document.createElement('div')
  bdContainer.className = 'cost-breakdown'
  for (const b of data.breakdown) {
    const row = document.createElement('div')
    row.className = 'cost-breakdown-row'
    const codeLabel = document.createElement('span')
    codeLabel.className = 'code-label'
    codeLabel.textContent = b.system + ' ' + b.code
    const price = document.createElement('span')
    price.className = b.error ? 'price error' : 'price'
    price.textContent = b.error ? b.error : b.price.toFixed(2) + '\u20AC'
    row.appendChild(codeLabel)
    row.appendChild(price)
    bdContainer.appendChild(row)
  }
  el.appendChild(bdContainer)
}

function updateRowPrices(breakdown) {
  if (!breakdown) return
  const priceMap = new Map()
  for (const b of breakdown) {
    priceMap.set(b.system + ':' + b.code, b)
  }
  const rows = document.querySelectorAll('.billing-row')
  for (const row of rows) {
    const code = row.querySelector('.item-code')?.value?.trim()
    const system = row.querySelector('.item-system')?.value
    if (!code || !system) continue

    const existingPrice = row.querySelector('.item-price')
    if (existingPrice) existingPrice.remove()

    const entry = priceMap.get(system + ':' + code)
    if (entry) {
      const span = document.createElement('span')
      span.className = 'item-price'
      span.textContent = entry.error ? '\u2014' : entry.price.toFixed(2) + '\u20AC'
      if (entry.error) span.title = entry.error
      const removeBtn = row.querySelector('.btn-remove')
      row.insertBefore(span, removeBtn)
    }
  }
}

// --- Analysis ---
async function startAnalysis() {
  const patientId = selectedPatient?.id
  if (!patientId) { alert('Bitte einen Patienten auswählen'); return }

  const billingItems = collectBillingItems()
  if (billingItems.length === 0) { alert('Keine Abrechnungspositionen ausgewählt'); return }

  const btn = document.getElementById('analyze-btn')
  btn.disabled = true

  document.getElementById('progress-log').innerHTML = ''
  document.getElementById('report-content').innerHTML = ''
  document.getElementById('status-bar').classList.remove('hidden')
  document.getElementById('status-text').textContent = `Analyse für ${selectedPatient.name} (${billingItems.length} Positionen)...`

  try {
    const res = await fetch('/api/agent/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, billingItems }),
    })
    const { sessionId, streamUrl } = await res.json()

    if (eventSource) eventSource.close()
    eventSource = new EventSource(streamUrl)

    eventSource.addEventListener('analysis_start', () => {
      addLog('info', `Analyse gestartet für ${selectedPatient.name}`)
    })

    eventSource.addEventListener('agent_start', (e) => {
      const data = JSON.parse(e.data)
      addLog('info', `Agent "${data.agent}" gestartet`)
    })

    eventSource.addEventListener('agent_progress', (e) => {
      const data = JSON.parse(e.data)
      document.getElementById('status-text').textContent = data.message || 'Verarbeitung...'
    })

    eventSource.addEventListener('agent_complete', (e) => {
      const data = JSON.parse(e.data)
      addLog('info', `Agent "${data.agent}" abgeschlossen`)
    })

    eventSource.addEventListener('finding', (e) => {
      const data = JSON.parse(e.data)
      addLog(data.severity || 'info', data.title || data.message || 'Fund')
    })

    eventSource.addEventListener('analysis_complete', (e) => {
      const data = JSON.parse(e.data)
      document.getElementById('status-bar').classList.add('hidden')
      btn.disabled = false
      if (data.report) renderReport(data.report)
      else addLog('info', 'Analyse abgeschlossen (kein Report)')
      eventSource.close()
    })

    eventSource.addEventListener('analysis_error', (e) => {
      const data = JSON.parse(e.data)
      addLog('error', `Fehler: ${data.error}`)
      document.getElementById('status-bar').classList.add('hidden')
      btn.disabled = false
      eventSource.close()
    })

    eventSource.onerror = () => {
      document.getElementById('status-bar').classList.add('hidden')
      btn.disabled = false
    }
  } catch (err) {
    addLog('error', `Fehler: ${err.message}`)
    document.getElementById('status-bar').classList.add('hidden')
    btn.disabled = false
  }
}

function addLog(severity, message) {
  const log = document.getElementById('progress-log')
  const entry = document.createElement('div')
  entry.className = `log-entry ${severity}`
  entry.textContent = `${new Date().toLocaleTimeString('de')} — ${message}`
  log.appendChild(entry)
  log.scrollTop = log.scrollHeight
}

// --- Report rendering ---
function renderReport(report) {
  const el = document.getElementById('report-content')

  const summaryHtml = `
    <div class="report-summary">
      <div class="summary-card errors"><div class="value">${report.summary.errors}</div><div class="label">Fehler</div></div>
      <div class="summary-card warnings"><div class="value">${report.summary.warnings}</div><div class="label">Warnungen</div></div>
      <div class="summary-card suggestions"><div class="value">${report.summary.suggestions}</div><div class="label">Vorschläge</div></div>
      <div class="summary-card"><div class="value">${report.summary.estimatedRevenueDelta >= 0 ? '+' : ''}${report.summary.estimatedRevenueDelta.toFixed(2)}€</div><div class="label">Erlösdelta</div></div>
      <div class="summary-card"><div class="value">${report.summary.documentationComplete ? '✓' : '✗'}</div><div class="label">Doku komplett</div></div>
    </div>
    <p style="font-size:0.85rem;margin-bottom:1rem"><strong>${report.patientName}</strong> — ${report.coverageType} — ${report.analysisDate}</p>
  `

  const findingsHtml = report.findings.map(f => `
    <div class="finding ${f.severity}">
      <h4>${f.title}</h4>
      <p>${f.description}</p>
      <div class="codes">Codes: ${f.codes.join(', ')}</div>
      <div class="action">→ ${f.action}</div>
    </div>
  `).join('')

  const recsHtml = report.recommendedCodes.length > 0 ? `
    <h3 style="font-size:0.9rem;margin:1rem 0 0.5rem">Empfohlene Codes</h3>
    ${report.recommendedCodes.map(r => `
      <div class="finding suggestion">
        <h4>${r.system} ${r.code} ${r.isNew ? '(neu)' : '(Anpassung)'}</h4>
        <p>${r.reason}</p>
      </div>
    `).join('')}
  ` : ''

  el.innerHTML = summaryHtml + findingsHtml + recsHtml
}

// --- Practice Rules ---
async function loadRules() {
  try {
    const res = await fetch('/api/practice-rules')
    const data = await res.json()
    renderRules(data.rules || [])
  } catch (err) {
    document.getElementById('rules-list').innerHTML = `<p>Fehler: ${err.message}</p>`
  }
}

function renderRules(rules) {
  const el = document.getElementById('rules-list')
  if (rules.length === 0) {
    el.innerHTML = '<p style="font-size:0.85rem;color:#718096">Keine Praxisregeln definiert.</p>'
    return
  }
  el.innerHTML = rules.map(r => `
    <div class="rule-card">
      <input type="checkbox" class="toggle" ${r.enabled ? 'checked' : ''} data-id="${r.id}">
      <div class="rule-info">
        <div class="rule-name">${r.name}</div>
        <div class="rule-desc">${r.description}</div>
      </div>
      <span class="rule-category">${r.category}</span>
    </div>
  `).join('')
}

// --- Init ---
document.getElementById('patient-select').addEventListener('change', onPatientSelect)
loadPatients()
loadRules()
