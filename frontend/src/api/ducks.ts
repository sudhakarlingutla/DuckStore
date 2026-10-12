import type { Duck, DuckChanges, NewDuck } from '../domain/duck.ts'
import { request } from './client.ts'

export interface AddDuckResult {
  duck: Duck
  /** True when the stock was added to a duck that already existed. */
  merged: boolean
}

export async function listDucks(): Promise<Duck[]> {
  const { data } = await request<Duck[]>('GET', '/ducks')
  return data
}

export async function addDuck(duck: NewDuck): Promise<AddDuckResult> {
  const { status, data } = await request<Duck>('POST', '/ducks', duck)
  // The API answers 201 for a new duck and 200 for a merge.
  return { duck: data, merged: status === 200 }
}

export async function editDuck(
  id: number,
  version: number,
  changes: DuckChanges,
): Promise<Duck> {
  const { data } = await request<Duck>('PATCH', `/ducks/${id}`, {
    version,
    ...changes,
  })
  return data
}

export async function deleteDuck(id: number): Promise<void> {
  await request<void>('DELETE', `/ducks/${id}`)
}
