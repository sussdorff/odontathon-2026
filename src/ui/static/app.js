// --- State ---
let patients = []
let selectedPatient = null
let selectedDate = null
let selectedClaim = null
let priorClaims = []
let eventSource = null
let flowStartTime = null

const STATUS_LABELS = {
  absent: 'fehlend', carious: 'kariös', 'crown-intact': 'Krone ok',
  'crown-needs-renewal': 'Krone erneuerungsbed.', 'bridge-anchor': 'Brückenanker',
  'replaced-bridge': 'Brückenglied', implant: 'Implantat',
  'implant-with-crown': 'Implantat+Krone', filled: 'Füllung',
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
      opt.textContent = `${p.name} [${p.coverageType}] — ${p.findingsCount} Befunde`
      select.appendChild(opt)
    }
  } catch (err) {
    select.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

function onPatientSelect() {
  const id = document.getElementById('patient-select').value
  selectedPatient = patients.find(p => p.id === id) || null
  selectedDate = null; selectedClaim = null; priorClaims = []

  const infoEl = document.getElementById('patient-info')
  if (!selectedPatient) {
    infoEl.classList.add('hidden')
    document.getElementById('case-context').classList.add('hidden')
    document.getElementById('date-section').classList.add('hidden')
    document.getElementById('billing-section').classList.add('hidden')
    document.getElementById('analyze-btn').disabled = true
    return
  }

  const age = selectedPatient.birthDate ? Math.floor((Date.now() - new Date(selectedPatient.birthDate).getTime()) / 31557600000) : '?'
  infoEl.innerHTML = `
    <div class="info-item"><span class="info-label">Name</span><span class="info-value">${selectedPatient.name}</span></div>
    <div class="info-item"><span class="info-label">Alter</span><span class="info-value">${age} J.</span></div>
    <div class="info-item"><span class="info-label">Vers.</span><span class="info-value"><span class="badge ${selectedPatient.coverageType.toLowerCase()}">${selectedPatient.coverageType}</span></span></div>
    ${selectedPatient.bonusPercent > 0 ? `<div class="info-item"><span class="info-label">Bonus</span><span class="info-value">${selectedPatient.bonusPercent}%</span></div>` : ''}
    <div class="info-item"><span class="info-label">Befunde</span><span class="info-value">${selectedPatient.findingsCount}</span></div>`
  infoEl.classList.remove('hidden')
  renderCaseContext(selectedPatient)
  document.getElementById('case-context').classList.remove('hidden')
  populateDateSelector()
}

function populateDateSelector() {
  const claims = selectedPatient?.claims || []
  const dateSelect = document.getElementById('date-select')
  const dateSection = document.getElementById('date-section')

  if (!claims.length) {
    dateSection.classList.add('hidden')
    document.getElementById('billing-section').classList.add('hidden')
    return
  }

  dateSelect.innerHTML = '<option value="">— Datum wählen —</option>'
  for (const claim of claims) {
    const opt = document.createElement('option')
    opt.value = claim.date
    opt.dataset.claimId = claim.id
    const teeth = claim.teeth.length ? ` · Zähne ${claim.teeth.join(',')}` : ''
    opt.textContent = `${claim.date} — ${claim.itemCount} Pos.${teeth} (${claim.provider || '?'})`
    dateSelect.appendChild(opt)
  }
  dateSection.classList.remove('hidden')
}

function onDateSelect() {
  const dateSelect = document.getElementById('date-select')
  const selected = dateSelect.selectedOptions[0]
  selectedDate = dateSelect.value || null

  if (!selectedDate || !selectedPatient) {
    document.getElementById('billing-section').classList.add('hidden')
    document.getElementById('analyze-btn').disabled = true
    return
  }

  // Find the claim for this date
  selectedClaim = selectedPatient.claims.find(c => c.date === selectedDate) || null
  // All claims before this date = prior history for frequency checks
  priorClaims = selectedPatient.claims.filter(c => c.date < selectedDate)

  if (!selectedClaim) return

  renderSelectedBilling()
  renderPriorHistory()
  document.getElementById('billing-section').classList.remove('hidden')
  document.getElementById('analyze-btn').disabled = false
}

function renderSelectedBilling() {
  if (!selectedClaim) return
  const container = document.getElementById('billing-items')

  // Render claim header card
  const headerEl = document.getElementById('selected-claim-header')
  const teethStr = selectedClaim.teeth.length ? selectedClaim.teeth.join(', ') : '—'
  headerEl.innerHTML = `
    <div class="claim-hdr-row">
      <span class="claim-hdr-date">${selectedClaim.date}</span>
      <span class="claim-hdr-id">${selectedClaim.id}</span>
      <span class="claim-hdr-provider">${selectedClaim.provider || ''}</span>
    </div>
    <div class="claim-hdr-details">
      <span class="claim-hdr-pill">${selectedClaim.itemCount} Positionen</span>
      <span class="claim-hdr-pill">Zähne: ${teethStr}</span>
      ${priorClaims.length ? `<span class="claim-hdr-pill">${priorClaims.length} vorige Rechnungen</span>` : ''}
    </div>`

  // Group by session if multi-session
  const hasSessions = selectedClaim.items.some(i => i.session)
  let html = ''

  if (hasSessions) {
    const bySession = new Map()
    for (const it of selectedClaim.items) {
      const s = it.session || 0
      if (!bySession.has(s)) bySession.set(s, [])
      bySession.get(s).push(it)
    }
    for (const [sess, items] of [...bySession.entries()].sort((a,b) => a[0]-b[0])) {
      if (sess > 0) html += `<div class="session-label">Sitzung ${sess}</div>`
      for (const it of items) html += createBillingRowFromItem(it)
    }
  } else {
    for (const it of selectedClaim.items) html += createBillingRowFromItem(it)
  }

  container.innerHTML = html
}

function createBillingRowFromItem(it) {
  const sysCls = it.system === 'GOZ' ? 'goz' : it.system === 'GOÄ' ? 'goae' : 'bema'
  const toothStr = it.tooth ? String(it.tooth) : ''
  const surfStr = it.surfaces?.length ? ` (${it.surfaces.join(',')})` : ''
  const noteHtml = it.note ? `<span class="item-note">${it.note}</span>` : ''
  // Only GOZ has multiplier
  const multHtml = it.system === 'GOZ' ? 'value="2.3"' : 'disabled placeholder="—"'
  return `<div class="billing-row suggested">
    <input type="checkbox" class="item-toggle" checked>
    <span class="sys-badge ${sysCls}">${it.system}</span>
    <input type="text" class="item-code" value="${it.code}" readonly>
    <input type="number" class="item-multiplier" step="0.1" min="1" ${multHtml}>
    <input type="text" class="item-teeth" value="${toothStr}">
    <span class="item-desc" title="${it.display || ''}">${it.display || ''}${surfStr}${noteHtml}</span>
    <button class="btn-remove" onclick="this.closest('.billing-row').remove()">×</button>
  </div>`
}

function renderPriorHistory() {
  const priorEl = document.getElementById('prior-history')
  const contentEl = document.getElementById('prior-history-content')

  if (!priorClaims.length) {
    priorEl.classList.add('hidden')
    return
  }

  const totalItems = priorClaims.reduce((s, c) => s + c.itemCount, 0)
  contentEl.innerHTML = `<div class="muted" style="margin-bottom:0.3rem">${totalItems} Positionen aus ${priorClaims.length} früheren Sitzungen (vor ${selectedDate})</div>` +
    priorClaims.map(claim => {
      const teeth = claim.teeth.length ? `Zähne ${claim.teeth.join(',')}` : ''
      return `<details class="prior-claim-card">
        <summary class="prior-claim-header">
          <span class="visit-date">${claim.date}</span>
          <span class="visit-summary">${claim.itemCount} Pos. · ${teeth || 'kein Zahnbezug'} · ${claim.provider || ''}</span>
        </summary>
        <table class="claim-items">${claim.items.map(it => renderClaimItem(it)).join('')}</table>
      </details>`
    }).join('')
  priorEl.classList.remove('hidden')
}

// --- Case context ---
function renderCaseContext(p) {
  // Coverage section — compact key-value pills
  const covEl = document.getElementById('context-coverage')
  const covItems = [
    `<span class="badge ${p.coverageType.toLowerCase()}">${p.coverageType}</span>`,
    p.coveragePayor ? `<span class="ctx-kv"><span class="ctx-k">Träger</span> ${p.coveragePayor.replace('Organization/', '')}</span>` : '',
    p.coverageId ? `<span class="ctx-kv"><span class="ctx-k">Nr.</span> <code>${p.coverageId}</code></span>` : '',
    `<span class="ctx-kv"><span class="ctx-k">Bonus</span> ${p.bonusPercent > 0 ? p.bonusPercent + '%' : '—'}</span>`,
    p.pflegegrad ? `<span class="ctx-kv"><span class="ctx-k">Pflegegrad</span> ${p.pflegegrad}</span>` : '',
    p.eingliederungshilfe ? `<span class="ctx-kv"><span class="ctx-k">EGH</span> ja</span>` : '',
  ].filter(Boolean)
  covEl.innerHTML = `<div class="ctx-heading">Versicherung</div><div class="ctx-pills">${covItems.join('')}</div>`

  // Findings section
  const findEl = document.getElementById('context-findings')
  const findings = p.findings || []
  const sorted = [...findings].sort((a, b) => a.tooth - b.tooth)
  if (sorted.length) {
    // Group by status for summary
    const byStatus = {}
    for (const f of sorted) { byStatus[f.status] = (byStatus[f.status] || 0) + 1 }
    const summaryParts = Object.entries(byStatus).map(([s, n]) => `${n}× ${STATUS_LABELS[s] || s}`).join(', ')
    const colors = { absent:'#fed7d7', carious:'#fefcbf', 'crown-needs-renewal':'#feebc8', 'crown-intact':'#c6f6d5', 'bridge-anchor':'#e9d8fd', 'replaced-bridge':'#fed7e2', implant:'#bee3f8', 'implant-with-crown':'#bee3f8', filled:'#c6f6d5' }
    const usedStatuses = [...new Set(sorted.map(f => f.status))]
    findEl.innerHTML = `
      <div class="ctx-heading">Befunde <span class="ctx-count">${sorted.length} Zähne — ${summaryParts}</span></div>
      <div class="findings-grid">${sorted.map(f => {
        const label = STATUS_LABELS[f.status] || f.status
        const surfaces = f.surfaces?.length ? ` (${f.surfaces.join(',')})` : ''
        return `<div class="finding-chip ${f.status}" title="${label}${surfaces}"><span class="tooth-num">${f.tooth}</span><span>${label}${surfaces}</span></div>`
      }).join('')}</div>
      <div class="findings-legend">${usedStatuses.map(s => `<span><span class="legend-dot" style="background:${colors[s]||'#edf2f7'}"></span>${STATUS_LABELS[s]||s}</span>`).join('')}</div>`
  } else {
    findEl.innerHTML = '<div class="ctx-heading">Befunde</div><span class="muted">Keine Befunde</span>'
  }

  // Conditions section
  const condEl = document.getElementById('context-conditions')
  const conditions = p.conditions || []
  if (conditions.length) {
    condEl.innerHTML = `
      <div class="ctx-heading">Diagnosen <span class="ctx-count">${conditions.length}</span></div>
      <div class="ctx-pills">${conditions.map(c =>
        `<span class="ctx-tag">${c.display || c.code || '?'}</span>`
      ).join('')}</div>`
  } else {
    condEl.innerHTML = '<div class="ctx-heading">Diagnosen</div><span class="muted">Keine</span>'
  }

  // Billing history — structured claims with full detail
  const histEl = document.getElementById('context-history')
  const claims = p.claims || []
  if (claims.length) {
    const totalItems = claims.reduce((s, c) => s + c.itemCount, 0)
    histEl.innerHTML = `
      <div class="ctx-heading">Abrechnungshistorie <span class="ctx-count">${totalItems} Positionen in ${claims.length} Rechnungen</span></div>
      <div class="claims-list">
        ${claims.map(claim => {
          const teethStr = claim.teeth.length ? `Zähne ${claim.teeth.join(', ')}` : ''
          // Group items by session if multi-session
          const hasSessions = claim.items.some(i => i.session)
          let itemsHtml = ''
          if (hasSessions) {
            const bySession = new Map()
            for (const it of claim.items) {
              const s = it.session || 0
              if (!bySession.has(s)) bySession.set(s, [])
              bySession.get(s).push(it)
            }
            itemsHtml = [...bySession.entries()].sort((a,b) => a[0]-b[0]).map(([sess, items]) =>
              `${sess > 0 ? `<div class="session-label">Sitzung ${sess}</div>` : ''}
              <table class="claim-items">${items.map(it => renderClaimItem(it)).join('')}</table>`
            ).join('')
          } else {
            itemsHtml = `<table class="claim-items">${claim.items.map(it => renderClaimItem(it)).join('')}</table>`
          }
          return `<details class="claim-card">
            <summary class="claim-header">
              <span class="claim-date">${claim.date}</span>
              <span class="claim-meta">${claim.itemCount} Pos. · ${teethStr || 'kein Zahnbezug'}</span>
              <span class="claim-provider">${claim.provider || ''}</span>
            </summary>
            <div class="claim-body">${itemsHtml}</div>
          </details>`
        }).join('')}
      </div>`
  } else {
    histEl.innerHTML = '<div class="ctx-heading">Abrechnungshistorie</div><span class="muted">Keine bisherigen Abrechnungen</span>'
  }
}

function renderClaimItem(it) {
  const sysCls = it.system === 'GOZ' ? 'goz' : it.system === 'GOÄ' ? 'goae' : 'bema'
  const toothStr = it.tooth ? `Z.${it.tooth}` : ''
  const surfStr = it.surfaces?.length ? `(${it.surfaces.join(',')})` : ''
  const qtyStr = it.quantity > 1 ? `×${it.quantity}` : ''
  const noteStr = it.note ? `<span class="item-note">${it.note}</span>` : ''
  return `<tr>
    <td class="ci-sys"><span class="sys-badge ${sysCls}">${it.system}</span></td>
    <td class="ci-code"><code>${it.code}</code>${qtyStr}</td>
    <td class="ci-desc">${it.display || ''}${noteStr}</td>
    <td class="ci-tooth">${toothStr} ${surfStr}</td>
  </tr>`
}

function toggleContext() {
  const body = document.getElementById('case-context-body')
  const btn = document.getElementById('context-toggle')
  body.classList.toggle('collapsed')
  btn.textContent = body.classList.contains('collapsed') ? '▶' : '▼'
}

// --- Billing items ---
function addBillingRow() {
  const row = document.createElement('div'); row.className = 'billing-row'
  row.innerHTML = `<input type="checkbox" class="item-toggle" checked><span class="sys-badge goz">GOZ</span><input type="text" class="item-code" placeholder="Code"><input type="number" class="item-multiplier" placeholder="Fak." step="0.1" min="1"><input type="text" class="item-teeth" placeholder="Zahn"><span class="item-desc"></span><button class="btn-remove" onclick="this.closest('.billing-row').remove()">×</button>`
  document.getElementById('billing-items').appendChild(row)
}
function collectBillingItems() {
  return [...document.querySelectorAll('.billing-row')].filter(r => {
    const t = r.querySelector('.item-toggle'); return !t || t.checked
  }).map(r => {
    const code = r.querySelector('.item-code').value.trim()
    if (!code) return null
    const sysBadge = r.querySelector('.sys-badge')
    const sysSelect = r.querySelector('.item-system')
    const system = sysBadge ? sysBadge.textContent.trim() : sysSelect?.value || 'GOZ'
    const multiplier = parseFloat(r.querySelector('.item-multiplier').value) || undefined
    const teethStr = r.querySelector('.item-teeth').value.trim()
    const teeth = teethStr ? teethStr.split(',').map(t => parseInt(t.trim())).filter(Boolean) : undefined
    return { code, system, multiplier, teeth }
  }).filter(Boolean)
}

function collectPriorHistory() {
  return priorClaims.flatMap(c =>
    c.items.map(i => ({ code: i.code, system: i.system, date: c.date, tooth: i.tooth }))
  )
}

// ===== EXECUTION FLOW TIMELINE =====

// Clean up tool names: mcp__dental-billing__validate_billing → validate_billing
function cleanToolName(name) {
  if (!name) return 'unknown'
  return name.replace(/^mcp__[^_]+__/, '').replace(/^dental-billing:/, '')
}

// Parse MCP tool result wrapper to extract actual content
function parseToolResult(raw) {
  if (raw == null) return null
  let data = raw
  // Keep trying to parse strings (handles double-stringified data)
  for (let i = 0; i < 3; i++) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { break }
    } else { break }
  }
  // MCP wrapper: [{"type":"text","text":"..."}]
  if (Array.isArray(data) && data.length && data[0]?.type === 'text' && data[0]?.text) {
    let inner = data[0].text
    try { return JSON.parse(inner) } catch { return inner }
  }
  // {content: [{"type":"text","text":"..."}]} — alternate wrapper
  if (data?.content && Array.isArray(data.content) && data.content[0]?.type === 'text') {
    let inner = data.content[0].text
    try { return JSON.parse(inner) } catch { return inner }
  }
  return data
}

// Format parsed result as a readable summary
function summarizeResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return String(parsed || '')
  // Validation result
  if ('valid' in parsed && 'issues' in parsed) {
    const v = parsed; const errs = v.issues.filter(i => i.severity === 'error').length
    const warns = v.issues.filter(i => i.severity === 'warning').length
    return `${v.valid ? '✅ Valide' : '❌ Nicht valide'} — ${errs} Fehler, ${warns} Warnungen, ${v.issues.length} Gesamt`
  }
  // Case context
  if ('patient' in parsed && 'coverageType' in parsed) {
    return `${parsed.patient.name} (${parsed.coverageType}${parsed.bonusPercent ? ', '+parsed.bonusPercent+'% Bonus' : ''}) — ${parsed.findings?.length || 0} Befunde, ${parsed.billingHistory?.length || 0} Historieneinträge`
  }
  // Catalog lookup
  if ('found' in parsed && 'code' in parsed) {
    if (!parsed.found) return `❌ ${parsed.message || 'Nicht gefunden'}`
    return `${parsed.system} ${parsed.code}: ${parsed.description?.slice(0, 60) || ''} — ${parsed.punktzahl || '?'} Pkt, ${parsed.euroEinfachsatz || '?'}€ (${parsed.multiplierMin||'?'}–${parsed.multiplierMax||'?'}x)`
  }
  // Documentation check
  if ('found' in parsed && 'templateName' in parsed) {
    if (!parsed.found) return `Kein Template gefunden`
    return `${parsed.templateName}: ${parsed.complete ? '✅ Vollständig' : `❌ ${parsed.missingFields?.length || '?'} Pflichtfelder fehlen`} (${parsed.totalRequiredFields} Pflichtfelder)`
  }
  // Pattern matching (array)
  if (Array.isArray(parsed) && parsed[0]?.requiredCodes) {
    return `${parsed.length} Muster: ${parsed.map(p => p.name).join(', ')}`
  }
  // Practice rules
  if ('rules' in parsed && 'totalEnabled' in parsed) {
    return `${parsed.totalEnabled} aktive Regeln (Version ${parsed.version})`
  }
  // Generic
  if (parsed.message) return parsed.message
  return JSON.stringify(parsed).slice(0, 200)
}

function clearFlow() {
  document.getElementById('flow-timeline').innerHTML = ''
  flowStartTime = Date.now()
  activeAgentEl = null
}

let activeAgentEl = null

function getElapsed() {
  return flowStartTime ? ((Date.now() - flowStartTime) / 1000).toFixed(1) + 's' : ''
}

function createStep(parentEl, cssClass, icon, title, subtitle, detail, expandable) {
  const step = document.createElement('div')
  step.className = `step ${cssClass}`
  const expandBtn = expandable && detail ? `<button class="expand-btn" onclick="this.closest('.step').querySelector('.step-expand').classList.toggle('collapsed')">▼</button>` : ''
  step.innerHTML = `
    <div class="step-header">
      <span class="step-icon">${icon}</span>
      <div class="step-titles">
        <span class="step-title">${title}</span>
        ${subtitle ? `<span class="step-subtitle">${subtitle}</span>` : ''}
      </div>
      <span class="step-time">${getElapsed()}</span>
      ${expandBtn}
    </div>
    ${detail ? `<div class="step-expand${expandable ? ' collapsed' : ''}">${detail}</div>` : ''}`
  parentEl.appendChild(step)
  parentEl.scrollTop = parentEl.scrollHeight
  return step
}

function createAgentLane(parentEl, agentName, prompt) {
  const lane = document.createElement('div')
  lane.className = 'agent-lane'
  lane.innerHTML = `
    <div class="lane-header">
      <span class="lane-icon"><span class="spinner-sm"></span></span>
      <span class="lane-title">${agentName}</span>
      <span class="lane-time">${getElapsed()}</span>
    </div>
    ${prompt ? `<div class="lane-prompt">${escHtml(prompt).slice(0, 300)}${prompt.length > 300 ? '…' : ''}</div>` : ''}
    <div class="lane-steps"></div>
    <div class="lane-footer hidden"></div>`
  parentEl.appendChild(lane)
  parentEl.scrollTop = parentEl.scrollHeight
  return lane
}

function finishAgentLane(lane, status, summary, stats) {
  if (!lane) return
  const icon = lane.querySelector('.lane-icon')
  const footer = lane.querySelector('.lane-footer')
  icon.innerHTML = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏹'
  lane.classList.add(status === 'completed' ? 'done' : 'failed')
  footer.innerHTML = `<span>${summary || status}</span>${stats ? `<span class="lane-stats">${stats}</span>` : ''}`
  footer.classList.remove('hidden')
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function setFlowStatus(text) {
  const s = document.getElementById('flow-status'), t = document.getElementById('flow-status-text')
  if (text) { t.textContent = text; s.classList.remove('hidden') } else s.classList.add('hidden')
}

// ===== ANALYSIS =====
async function startAnalysis() {
  const patientId = selectedPatient?.id
  if (!patientId) { alert('Bitte einen Patienten auswählen'); return }
  const billingItems = collectBillingItems()
  if (!billingItems.length) { alert('Keine Abrechnungspositionen ausgewählt'); return }
  const history = collectPriorHistory()
  const btn = document.getElementById('analyze-btn'); btn.disabled = true
  clearFlow()
  document.getElementById('report-content').innerHTML = '<p class="muted">Analyse läuft...</p>'
  setFlowStatus('Analyse wird gestartet...')

  const timeline = document.getElementById('flow-timeline')
  createStep(timeline, 'phase', '▶', `Analyse: ${selectedPatient.name} — ${selectedDate}`,
    `${billingItems.length} Positionen, ${history.length} Historie-Einträge`,
    `<code>${billingItems.map(i => `${i.system} ${i.code}${i.multiplier ? ' ×'+i.multiplier : ''}${i.teeth ? ' Z.'+i.teeth.join(',') : ''}`).join(', ')}</code>`, false)

  try {
    const res = await fetch('/api/agent/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, billingItems, history, analysisDate: selectedDate }),
    })
    const { sessionId, streamUrl } = await res.json()
    if (eventSource) eventSource.close()
    eventSource = new EventSource(streamUrl)

    // Manager section
    const managerSection = document.createElement('div'); managerSection.className = 'manager-section'
    managerSection.innerHTML = '<div class="section-label">📋 Manager</div><div class="manager-steps"></div>'
    timeline.appendChild(managerSection)
    const managerSteps = managerSection.querySelector('.manager-steps')

    // Agent lanes container
    const agentsContainer = document.createElement('div'); agentsContainer.className = 'agents-container'
    agentsContainer.innerHTML = '<div class="section-label">🤖 Sub-Agenten</div><div class="agents-lanes"></div>'
    timeline.appendChild(agentsContainer)
    const agentsLanes = agentsContainer.querySelector('.agents-lanes')

    // Track active lanes
    const activeLanes = new Map()

    eventSource.addEventListener('manager_thinking', (e) => {
      const d = JSON.parse(e.data)
      createStep(managerSteps, 'thinking', '💭', 'Denkt', '', `<div class="text-content">${escHtml(d.text)}</div>`, d.text?.length > 150)
      setFlowStatus('Manager analysiert...')
    })

    eventSource.addEventListener('manager_tool_call', (e) => {
      const d = JSON.parse(e.data)
      const tool = cleanToolName(d.tool)
      let inputDisplay = ''
      try {
        const inp = typeof d.input === 'string' ? JSON.parse(d.input) : d.input
        inputDisplay = `<code class="tool-params">${Object.entries(inp || {}).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}</code>`
      } catch { inputDisplay = `<code class="tool-params">${escHtml(String(d.input).slice(0, 200))}</code>` }
      createStep(managerSteps, 'tool-call', '🔧', tool, '', inputDisplay, false)
      setFlowStatus(`${tool}...`)
    })

    eventSource.addEventListener('manager_tool_result', (e) => {
      const d = JSON.parse(e.data)
      const parsed = parseToolResult(d.result)
      const summary = summarizeResult(parsed)
      const hasDetail = typeof parsed === 'object'
      createStep(managerSteps, 'tool-result', '📥', summary, '',
        hasDetail ? `<pre class="json-block">${escHtml(JSON.stringify(parsed, null, 2))}</pre>` : '', hasDetail)
    })

    eventSource.addEventListener('agent_start', (e) => {
      const d = JSON.parse(e.data)
      const name = d.agent || 'Sub-Agent'
      const key = d.taskId || name
      const lane = createAgentLane(agentsLanes, name, d.prompt)
      activeLanes.set(key, lane)
      setFlowStatus(`Sub-Agent: ${name}`)
    })

    eventSource.addEventListener('agent_progress', (e) => {
      const d = JSON.parse(e.data)
      const key = d.taskId || d.agent
      const lane = activeLanes.get(key)
      if (!lane) return
      const stepsEl = lane.querySelector('.lane-steps')
      if (d.lastTool) {
        createStep(stepsEl, 'tool-call', '⚙️', cleanToolName(d.lastTool), d.summary || '', '', false)
      } else if (d.summary) {
        createStep(stepsEl, 'thinking', '💭', d.summary, '', '', false)
      }
      setFlowStatus(`${d.agent || 'Sub-Agent'}${d.lastTool ? ' → '+cleanToolName(d.lastTool) : ''}`)
    })

    eventSource.addEventListener('agent_tool_call', (e) => {
      const d = JSON.parse(e.data)
      // Try to find active lane
      const key = d.taskId
      const lane = activeLanes.get(key)
      if (lane) {
        const stepsEl = lane.querySelector('.lane-steps')
        createStep(stepsEl, 'tool-call', '⚙️', cleanToolName(d.tool), '',
          d.input ? `<code class="tool-params">${escHtml(String(d.input).slice(0, 200))}</code>` : '', false)
      }
    })

    eventSource.addEventListener('agent_complete', (e) => {
      const d = JSON.parse(e.data)
      const key = d.taskId || d.agent
      const lane = activeLanes.get(key)
      const stats = d.tokens ? `${d.toolUses} Tools · ${Math.round(d.tokens/1000)}k Tokens` : ''
      finishAgentLane(lane, d.status, d.summary?.slice(0, 300), stats)
      activeLanes.delete(key)
      setFlowStatus('Manager sammelt Ergebnisse...')
    })

    eventSource.addEventListener('analysis_complete', (e) => {
      const d = JSON.parse(e.data)
      createStep(timeline, 'phase done', '🏁', 'Analyse abgeschlossen',
        d.costUsd ? `Kosten: $${d.costUsd.toFixed(3)}` : '',
        '', false)
      setFlowStatus(null); btn.disabled = false
      if (d.report) renderReport(d.report)
      else document.getElementById('report-content').innerHTML = '<p class="muted">Kein Report erhalten.</p>'
      eventSource.close()
    })

    eventSource.addEventListener('analysis_error', (e) => {
      const d = JSON.parse(e.data)
      createStep(timeline, 'phase error', '❌', 'Fehler', d.error, '', false)
      setFlowStatus(null); btn.disabled = false
      document.getElementById('report-content').innerHTML = `<p style="color:#c53030">${escHtml(d.error)}</p>`
      eventSource.close()
    })

    eventSource.onerror = () => { setFlowStatus(null); btn.disabled = false }
  } catch (err) {
    createStep(document.getElementById('flow-timeline'), 'phase error', '❌', 'Fehler', err.message, '', false)
    setFlowStatus(null); btn.disabled = false
  }
}

// ===== REPORT =====
function renderReport(report) {
  const el = document.getElementById('report-content')
  el.innerHTML = `
    <div class="report-summary">
      <div class="summary-card errors"><div class="value">${report.summary.errors}</div><div class="label">Fehler</div></div>
      <div class="summary-card warnings"><div class="value">${report.summary.warnings}</div><div class="label">Warnungen</div></div>
      <div class="summary-card suggestions"><div class="value">${report.summary.suggestions}</div><div class="label">Vorschläge</div></div>
      <div class="summary-card"><div class="value">${report.summary.estimatedRevenueDelta>=0?'+':''}${report.summary.estimatedRevenueDelta.toFixed(2)}€</div><div class="label">Erlösdelta</div></div>
      <div class="summary-card"><div class="value">${report.summary.documentationComplete?'✓':'✗'}</div><div class="label">Doku</div></div>
    </div>
    <p style="font-size:0.8rem;margin-bottom:0.75rem"><strong>${report.patientName}</strong> — ${report.coverageType} — ${report.analysisDate}</p>
    ${report.findings.map(f => `<div class="finding-card ${f.severity}"><h4>[${f.category}] ${f.title}</h4><p>${f.description}</p><div class="codes">Codes: ${f.codes.join(', ')}</div><div class="action">→ ${f.action}</div></div>`).join('')}
    ${report.recommendedCodes.length ? `<h3 style="font-size:0.85rem;margin:0.75rem 0 0.4rem">Empfohlene Codes</h3>${report.recommendedCodes.map(r => `<div class="finding-card suggestion"><h4>${r.system} ${r.code} ${r.isNew?'(neu)':'(Anpassung)'}</h4><p>${r.reason}</p></div>`).join('')}` : ''}`
}

// ===== RULES =====
async function loadRules() {
  try { const res = await fetch('/api/practice-rules'); const data = await res.json(); renderRules(data.rules||[]) }
  catch (err) { document.getElementById('rules-list').innerHTML = `<p>Fehler: ${err.message}</p>` }
}
function renderRules(rules) {
  const el = document.getElementById('rules-list')
  if (!rules.length) { el.innerHTML = '<p class="muted">Keine Praxisregeln.</p>'; return }
  el.innerHTML = rules.map(r => `<div class="rule-card"><input type="checkbox" class="toggle" ${r.enabled?'checked':''} data-id="${r.id}"><div class="rule-info"><div class="rule-name">${r.name}</div><div class="rule-desc">${r.description}</div></div><span class="rule-category">${r.category}</span></div>`).join('')
}

// ===== INIT =====
document.getElementById('patient-select').addEventListener('change', onPatientSelect)
document.getElementById('date-select').addEventListener('change', onDateSelect)
loadPatients(); loadRules()
