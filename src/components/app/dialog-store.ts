'use client'

import { create } from 'zustand'

export type AppDialogId = 'new-account' | 'new-transaction'

type DialogStore = {
  active: AppDialogId | null
  open: (id: AppDialogId) => void
  close: () => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  active: null,
  open: (id) => set({ active: id }),
  close: () => set({ active: null }),
}))
