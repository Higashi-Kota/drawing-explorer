/**
 * Result type - Discriminated union for representing operation results
 */
export type Result<T, E> =
  | { readonly type: "success"; readonly data: T }
  | { readonly type: "error"; readonly error: E }

/**
 * OPFSError type - Errors that can occur during OPFS operations
 */
export type OPFSError =
  | { readonly type: "notSupported"; readonly message: string }
  | { readonly type: "permissionDenied"; readonly message: string }
  | { readonly type: "notFound"; readonly path: string }
  | { readonly type: "alreadyExists"; readonly path: string }
  | { readonly type: "unknown"; readonly cause: unknown }

/**
 * Helper functions for creating Result values
 */
export const Result = {
  success: <T, E>(data: T): Result<T, E> => ({
    type: "success",
    data,
  }),

  error: <T, E>(error: E): Result<T, E> => ({
    type: "error",
    error,
  }),
} as const

/**
 * Helper functions for creating OPFSError values
 */
export const OPFSError = {
  notSupported: (message: string): OPFSError => ({
    type: "notSupported",
    message,
  }),

  permissionDenied: (message: string): OPFSError => ({
    type: "permissionDenied",
    message,
  }),

  notFound: (path: string): OPFSError => ({
    type: "notFound",
    path,
  }),

  alreadyExists: (path: string): OPFSError => ({
    type: "alreadyExists",
    path,
  }),

  unknown: (cause: unknown): OPFSError => ({
    type: "unknown",
    cause,
  }),
} as const
