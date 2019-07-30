import * as Sentry from '@sentry/node'

import { IMiddlewareFunction } from 'graphql-middleware/dist/types'
class ExtendedError extends Error {
  errorId?: string
}

export type ExceptionScope<Context> = (
  scope: Sentry.Scope,
  error: Error,
  context: Context,
  reportError?: (res: Error | any) => boolean,
) => void

// Options for graphql-middleware-sentry
export interface Options<Context> {
  sentryInstance?: typeof Sentry
  config?: Sentry.NodeOptions
  withScope?: ExceptionScope<Context>
  captureReturnedErrors?: boolean
  forwardErrors?: boolean
  attachEventId?: boolean
  reportError?: (res: Error | any) => boolean
}

export class SentryError extends Error {}

export const sentry = <Context>({
  sentryInstance = null,
  config = {},
  withScope,
  captureReturnedErrors = false,
  forwardErrors = false,
  attachEventId = false,
  reportError,
}: Options<Context>): IMiddlewareFunction => {
  // Check if either sentryInstance or config.dsn is present
  if (!sentryInstance && !config.dsn) {
    throw new SentryError(
      `Missing the sentryInstance or the dsn parameter in configuration.`,
    )
  }

  if (!sentryInstance && config.dsn) {
    // Init Sentry
    sentryInstance = Sentry
    Sentry.init(config)
  }

  // Return middleware resolver
  return async (resolve, parent, args, ctx, info) => {
    try {
      const res = await resolve(parent, args, ctx, info)

      if (captureReturnedErrors && res instanceof Error) {
        captureException(
          sentryInstance,
          res,
          ctx,
          withScope,
          attachEventId,
          reportError,
        )
      }

      return res
    } catch (error) {
      captureException(
        sentryInstance,
        error,
        ctx,
        withScope,
        attachEventId,
        reportError,
      )

      // Forward error
      if (forwardErrors) {
        throw error
      }
    }
  }
}

function captureException<Context>(
  sentryInstance: typeof Sentry,
  error: ExtendedError,
  ctx: Context,
  withScope: ExceptionScope<Context>,
  attachEventId: boolean,
  reportError?: (res) => boolean,
) {
  if ((reportError && reportError(error)) || reportError === undefined) {
    sentryInstance.withScope(scope => {
      withScope(scope, error, ctx)
      let eventId = sentryInstance.captureException(error)
      if (attachEventId) error.errorId = eventId
    })
  }
}
