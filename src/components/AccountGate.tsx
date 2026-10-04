import { AccountGate as KitAccountGate } from '@tada/kit/account'
import { Fragment, type ReactNode, useState } from 'react'
import { fetchAccount } from '../lib/account'
import { ApiError, STANDALONE } from '../lib/api'
import { localStore, selectStore, serverStore } from '../lib/storage'
import { pullServerToLocal } from '../lib/sync'
import { SettingsSync } from './SettingsSync'

// Standalone build: no API and no account, one browser store for whoever uses this browser.
const standaloneStore = STANDALONE ? localStore('local') : null

/** Same mechanism as DaFinance: the API says where the signed-in user's data lives (@tada/kit/account). */
export function AccountGate({ children }: { children: ReactNode }) {
  // Private app and no grant: the API answers 403 `forbidden`; show nothing at all.
  const [denied, setDenied] = useState(false)
  if (standaloneStore) {
    selectStore(standaloneStore)
    return children
  }
  if (denied) return null
  return (
    <KitAccountGate
      fetchAccount={() =>
        fetchAccount().then(
          (account) => (setDenied(false), account),
          (e: unknown) => {
            if (e instanceof ApiError && e.status === 403 && e.code === 'forbidden') setDenied(true)
            throw e
          },
        )
      }
      // Revoked: the server keeps the data read-only; copy it here once and carry on locally.
      onReadonly={(account) => pullServerToLocal(account.email)}
      storeFor={(onServer, email) => (onServer ? serverStore : localStore(email))}
      // The subtree is keyed by the store, so every view reloads from the new one.
      provide={(store, subtree, key) => {
        selectStore(store)
        return (
          <Fragment key={key}>
            {store.kind === 'server' && <SettingsSync />}
            {subtree}
          </Fragment>
        )
      }}
    >
      {children}
    </KitAccountGate>
  )
}
