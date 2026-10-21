import { describe, expect, test } from 'bun:test'

import { cloudRoomsRefused, leaveRefusedRoom, rejoinRefusedRoom } from '@/app/cloud/rooms/live'
import type { EditorStore } from '@/app/editor/session'

import { asDouble } from '#tests/helpers/doubles'

/** A Cloud tab's store, recording what leaving its room did to it. */
function tab(options: { stored?: boolean } = {}) {
  const calls = { saves: 0, readOnly: [] as boolean[] }
  const store = asDouble<EditorStore>({
    state: { autosaveEnabled: false },
    getStorageBinding: () =>
      options.stored === false ? null : { providerId: 'cloud', documentId: 'document' },
    setReadOnly: (readOnly: boolean) => calls.readOnly.push(readOnly),
    saveFigFile: async () => {
      calls.saves++
    }
  })
  return { store, calls }
}

describe('a tab the relay refused', () => {
  test('shows it, and an editor saves on its own what the room no longer carries', () => {
    const { store, calls } = tab()
    leaveRefusedRoom(store, { permission: 'edit', canSave: true })
    expect(cloudRoomsRefused.value.has(store)).toBe(true)
    expect(store.state.autosaveEnabled).toBe(true)
    expect(calls.saves).toBe(1)
  })

  test('keeps a viewer read-only, and a guest without an account unsaved', () => {
    const viewer = tab()
    leaveRefusedRoom(viewer.store, { permission: 'view', canSave: false })
    expect(cloudRoomsRefused.value.has(viewer.store)).toBe(true)
    expect(viewer.calls.readOnly.at(-1)).toBe(true)
    expect(viewer.calls.saves).toBe(0)

    const guest = tab({ stored: false })
    leaveRefusedRoom(guest.store, { permission: 'edit', canSave: false })
    expect(guest.calls.saves).toBe(0)
    expect(guest.store.state.autosaveEnabled).toBe(false)
  })

  test('forgets the refusal on rejoining, and a second refusal records it once', async () => {
    const { store } = tab({ stored: false })
    leaveRefusedRoom(store, { permission: 'edit', canSave: true })
    leaveRefusedRoom(store, { permission: 'edit', canSave: true })
    expect([...cloudRoomsRefused.value].filter((refused) => refused === store)).toHaveLength(1)
    await rejoinRefusedRoom(store)
    expect(cloudRoomsRefused.value.has(store)).toBe(false)
  })
})
