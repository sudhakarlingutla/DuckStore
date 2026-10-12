export interface ErrorDetail {
  field: string
  message: string
}

/** Any failed API call, in one shape the UI can show. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]

  constructor(
    status: number,
    code: string,
    message: string,
    details: ErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface ApiResponse<T> {
  status: number
  data: T
}

/**
 * The single place the app talks HTTP. Every failure, whether the API said
 * no or the network is down, comes out as an ApiError.
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check that it is running and try again.',
    )
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  const data = response.status === 204 ? undefined : await response.json()
  return { status: response.status, data: data as T }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    if (typeof body?.code === 'string' && typeof body?.message === 'string') {
      return new ApiError(
        response.status,
        body.code,
        body.message,
        body.details ?? [],
      )
    }
  } catch {
    // Not JSON: fall through to the generic error below.
  }
  return new ApiError(
    response.status,
    'UNEXPECTED_RESPONSE',
    `The server gave an unexpected answer (status ${response.status}).`,
  )
}
