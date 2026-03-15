import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'child_process'

const PROJECT_ROOT = new URL('../../', import.meta.url).pathname

function reseed() {
  console.log('  → Reseeding demo data...')
  execSync('bun run seed:practice', { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 30000 })
  console.log('  → Reseed complete')
}

async function selectByText(page: Page, selector: string, substring: string) {
  const select = page.locator(selector)
  await select.waitFor({ state: 'visible', timeout: 10000 })
  const options = await select.locator('option').allTextContents()
  const match = options.find((text) => text.includes(substring))
  if (!match) throw new Error(`No option containing "${substring}". Options: ${options.join(' | ')}`)
  await select.selectOption({ label: match })
  await page.waitForTimeout(500)
}

async function selectLukasBerg(page: Page) {
  await selectByText(page, 'select >> nth=0', 'Lukas Berg')
  expect(await page.locator('select').first().inputValue()).toBe('patient-berg-lukas')
  await page.locator('select').nth(1).waitFor({ state: 'visible', timeout: 5000 })
  await selectByText(page, 'select >> nth=1', '2026-03-10')
  await page.waitForTimeout(500)
}

async function runAnalysisAndWait(page: Page) {
  await page.click('button:has-text("analysieren")')
  console.log('  → Analysis started, waiting for agent...')
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(5000)
    const count = await page.locator('button[title="Annehmen"]').count()
    if (count > 0) {
      console.log(`  → ${count} proposals after ${(i + 1) * 5}s`)
      return count
    }
    if (i % 4 === 3) console.log(`  → Waiting... (${(i + 1) * 5}s)`)
  }
  throw new Error('Analysis did not produce proposals within 120s')
}

test.describe('Invoice Analysis E2E — Lukas Berg 2026-03-10', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Abrechnung")')
    await page.waitForTimeout(2000)
  })

  test('before-analysis: billing items and clinical docs render correctly', async ({ page }) => {
    await selectLukasBerg(page)
    expect(await page.locator('body').textContent()).toContain('PKV')
    await expect(page.locator('text=KLINISCHE DOKUMENTATION').first()).toBeVisible({ timeout: 3000 })
    expect(await page.locator('code').count()).toBeGreaterThan(0)
    await expect(page.locator('button:has-text("analysieren")')).toBeVisible()
    console.log('  → Before-analysis state verified')
  })

  test('analysis detects issues and produces valid proposals', async ({ page }) => {
    await selectLukasBerg(page)
    const count = await runAnalysisAndWait(page)
    expect(count).toBeGreaterThan(0)

    const bodyText = (await page.locator('body').textContent() ?? '').toLowerCase()
    expect(bodyText).not.toContain('mehrkostenvereinbarung')
    expect(bodyText).not.toContain('gkv-patient')
    expect(bodyText).toContain('0070')
    console.log('  → Proposals validated')

    await page.locator('button[title="Annehmen"]').first().click()
    await expect(page.locator('text=/1 genehmigt/')).toBeVisible({ timeout: 3000 })
    console.log('  → Approve/reject working')
  })

  test('apply updates both billing and documentation, verified after reseed', async ({ page }) => {
    // Reseed to known baseline before test
    reseed()
    await page.waitForTimeout(1000)

    await selectLukasBerg(page)

    // Capture billing item count before analysis
    const codesBefore = await page.locator('code').count()
    console.log(`  → ${codesBefore} billing codes before analysis`)

    // Capture clinical doc content before
    const clinicalTextBefore = await page.locator('section, [class*="emerald"]').first().textContent() ?? ''

    await runAnalysisAndWait(page)

    // Approve all proposals
    const approveButtons = page.locator('button[title="Annehmen"]')
    const proposalCount = await approveButtons.count()
    for (let i = 0; i < proposalCount; i++) {
      await approveButtons.nth(i).click()
    }
    console.log(`  → ${proposalCount} proposals approved`)

    // Apply
    const applyBtn = page.locator('button:has-text("Änderung")')
    await expect(applyBtn).toBeVisible({ timeout: 3000 })
    await applyBtn.click()
    await expect(page.locator('text=Änderungen angewendet')).toBeVisible({ timeout: 10000 })
    console.log('  → Apply succeeded')

    // Verify applied results show both Claim and Procedure updates
    const resultText = await page.locator('body').textContent() ?? ''
    expect(resultText).toContain('Claim/')
    expect(resultText).toContain('Procedure/')
    console.log('  → Both Claim and Procedure patches confirmed')

    // Wait for refetch to complete
    await page.waitForTimeout(2000)

    // Re-select the same invoice to see updated data
    await selectByText(page, 'select >> nth=0', 'Lukas Berg')
    await page.waitForTimeout(500)
    await selectByText(page, 'select >> nth=1', '2026-03-10')
    await page.waitForTimeout(1000)

    // Verify billing items changed (should have more codes now)
    const codesAfter = await page.locator('code').count()
    console.log(`  → ${codesAfter} billing codes after apply (was ${codesBefore})`)
    expect(codesAfter).toBeGreaterThan(codesBefore)

    // Verify clinical documentation changed (Procedure notes should have Billing Coach entries)
    const clinicalTextAfter = await page.locator('section, [class*="emerald"]').first().textContent() ?? ''
    expect(clinicalTextAfter.length).toBeGreaterThan(clinicalTextBefore.length)
    console.log('  → Updated billing and documentation visible in UI')

    // Reseed to restore baseline
    reseed()
    console.log('  → Baseline restored')
  })

  test('changing patient clears analysis results', async ({ page }) => {
    await selectLukasBerg(page)
    await runAnalysisAndWait(page)
    expect(await page.locator('button[title="Annehmen"]').count()).toBeGreaterThan(0)

    await selectByText(page, 'select >> nth=0', 'Mueller')
    await page.waitForTimeout(500)
    expect(await page.locator('button[title="Annehmen"]').count()).toBe(0)
    console.log('  → Stale reset confirmed')
  })
})
