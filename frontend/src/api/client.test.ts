import { ApiError, request } from './client.ts'
import { addDuck, deleteDuck, editDuck } from './ducks.ts'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const failure = async (call: Promise<unknown>): Promise<ApiError> => {
  const error = await call.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('request', () => {
  it('sends JSON to the /api path and returns the status and data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }))

    const result = await request('POST', '/ducks', { color: 'Red' })

    expect(fetchMock).toHaveBeenCalledWith('/api/ducks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"color":"Red"}',
    })
    expect(result).toEqual({ status: 201, data: { id: 1 } })
  })

  it('turns an API error into an ApiError with its code and details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'The request is not valid.',
        details: [{ field: 'price', message: 'price must be positive' }],
      }),
    )

    const error = await failure(request('POST', '/ducks', {}))

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request is not valid.',
      details: [{ field: 'price', message: 'price must be positive' }],
    })
  })

  it('reports a response that is not from the API', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>Bad gateway</html>', { status: 502 }),
    )

    const error = await failure(request('GET', '/ducks'))

    expect(error).toMatchObject({ status: 502, code: 'UNEXPECTED_RESPONSE' })
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await failure(request('GET', '/ducks'))

    expect(error.code).toBe('NETWORK_ERROR')
  })
})

describe('ducks API', () => {
  const duck = {
    id: 1,
    color: 'Red',
    size: 'Large',
    price: 10,
    quantity: 5,
    version: 1,
  }
  const newDuck = {
    color: 'Red',
    size: 'Large',
    price: 10,
    quantity: 5,
  } as const

  it('reports a 201 as a new duck', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, duck))

    expect(await addDuck(newDuck)).toEqual({ duck, merged: false })
  })

  it('reports a 200 as a merge into an existing duck', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, duck))

    expect(await addDuck(newDuck)).toEqual({ duck, merged: true })
  })

  it('sends the version with an edit', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, duck))

    await editDuck(1, 4, { price: 12, quantity: 9 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ducks/1',
      expect.objectContaining({
        method: 'PATCH',
        body: '{"version":4,"price":12,"quantity":9}',
      }),
    )
  })

  it('handles the empty answer to a delete', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteDuck(1)).resolves.toBeUndefined()
  })
})
