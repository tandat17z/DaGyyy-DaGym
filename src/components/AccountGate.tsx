import { AccountGate as KitAccountGate } from '@tada/kit/account'
import { Fragment, type ReactNode } from 'react'
import { fetchAccount } from '../lib/account'
import { STANDALONE } from '../lib/api'
import { localStore, selectStore, serverStore } from '../lib/storage'
import { pullServerToLocal } from '../lib/sync'

// Standalone build: no API and no account, one browser store for whoever uses this browser.
const standaloneStore = STANDALONE ? localStore('local') : null

/** Same mechanism as DaFinance: the API says where the signed-in user's data lives (@tada/kit/account). */
export function AccountGate({ children }: { children: ReactNode }) {
  if (standaloneStore) {
    selectStore(standaloneStore)
    return children
  }
  return (
    <KitAccountGate
      fetchAccount={fetchAccount}
      // Revoked: the server keeps the data read-only; copy it here once and carry on locally.
      onReadonly={(account) => pullServerToLocal(account.email)}
      storeFor={(onServer, email) => (onServer ? serverStore : localStore(email))}
      // The subtree is keyed by the store, so every view reloads from the new one.
      provide={(store, subtree, key) => {
        selectStore(store)
        return <Fragment key={key}>{subtree}</Fragment>
      }}
    >
      {children}
    </KitAccountGate>
  )
}
