import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { chromium } from '@playwright/test'

const base = process.env.STORMWAKE_TEST_URL || 'http://127.0.0.1:4174'
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const reader = await browser.newPage()
  await page.clock.install()
  await page.goto(base)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Tornado', exact: true }).click()
  await page.getByRole('button', { name: /^Hard / }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByText('Enter coordinates', { exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Latitude' }).fill('64.317')
  await page.getByRole('spinbutton', { name: 'Longitude' }).fill('-96.02')
  await page.getByRole('button', { name: 'Set drop point' }).click()
  await page.getByRole('button', { name: 'Begin', exact: true }).click()
  await page.getByRole('button', { name: 'Evolve', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Damage', exact: true }).click()
  await page.getByRole('button', { name: 'Vortex Contraction', exact: true }).click()
  await page.getByRole('button', { name: 'Buy for 6 Momentum' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Speed 1×' }).click()
  await page.getByRole('button', { name: 'Speed 2×' }).click()
  await page.clock.runFor(65_000)
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Submit score', exact: true }).click()
  const name = 'Éclair <' + randomBytes(3).toString('hex') + '>'
  await page.getByLabel('Display name').fill(name)
  const submission = page.waitForResponse(response => response.url().endsWith('/submit'))
  await page.getByRole('dialog').getByRole('button', { name: 'Submit score', exact: true }).click()
  const result = await submission
  assert.ok(result.ok(), await result.text())
  const original = await result.json()
  const request = result.request()
  const auth = await request.headerValue('authorization')
  const input = request.postDataJSON()
  assert.ok(input.replay.commands.some(command => command.action === 'buy' && command.value === 'vortex'))
  const duplicate = await fetch(result.url(), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(input),
  })
  assert.equal(duplicate.status, 200)
  assert.equal((await duplicate.json()).id, original.id)
  const forged = await fetch(result.url(), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + randomBytes(32).toString('hex') },
    body: JSON.stringify(input),
  })
  assert.equal(forged.status, 403)
  const badStart = await fetch(base + '/api/runs/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ placement: input.replay.placement, rulesVersion: original.summary.rulesVersion }),
  })
  const badTicket = await badStart.json()
  const badReplay = { ...input.replay, seed: badTicket.seed, startedAt: badTicket.issuedAt, commands: [{ tick: 0, action: 'buy', value: 'multi-vortex' }] }
  const illegal = await fetch(base + '/api/runs/' + badTicket.id + '/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ token: badTicket.token, displayName: name, replay: badReplay }),
  })
  assert.equal(illegal.status, 422)
  await reader.goto(base)
  await reader.getByRole('button', { name: 'Leaderboards', exact: true }).click()
  await reader.getByLabel('Difficulty', { exact: true }).selectOption('Hard')
  await reader.getByText(name, { exact: false }).waitFor()
  console.log('Verified a completed run, duplicate retry, forged owner, illegal upgrade, and a separate browser reading the score.')
} finally {
  await browser.close()
}
