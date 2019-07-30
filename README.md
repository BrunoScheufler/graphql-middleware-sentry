# graphql-middleware-sentry

[![CircleCI](https://circleci.com/gh/BrunoScheufler/graphql-middleware-sentry.svg?style=shield)](https://circleci.com/gh/BrunoScheufler/graphql-middleware-sentry)
[![npm version](https://badge.fury.io/js/graphql-middleware-sentry.svg)](https://badge.fury.io/js/graphql-middleware-sentry)

> GraphQL Middleware plugin for Sentry.

## Usage

> With GraphQL Yoga

```ts
import { GraphQLServer } from 'graphql-yoga'
import { sentry } from 'graphql-middleware-sentry'

const typeDefs = `
  type Query {
    hello: String!
    bug: String!
  }
`

const resolvers = {
  Query: {
    hello: () => `Hey there!`
    bug: () => {
      throw new Error(`Many bugs!`)
    }
  }
}

const sentryMiddleware = sentry({
  config: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV
  },
  withScope: (scope, error, context) => {
    scope.setUser({
      id: context.authorization.userId,
    });
    scope.setExtra('body', context.request.body)
    scope.setExtra('origin', context.request.headers.origin)
    scope.setExtra('user-agent', context.request.headers['user-agent'])
  },
})

const server = GraphQLServer({
  typeDefs,
  resolvers,
  middlewares: [sentryMiddleware]
})

serve.start(() => `Server running on http://localhost:4000`)
```

### Using a Sentry instance

In cases where you want to use your own instance of Sentry to use it in other places in your application you can pass the `sentryInstance`. The `config` property should not be passed as an option.

#### Example usage with a Sentry instance

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
})

const sentryMiddleware = sentry({
  sentryInstance: Sentry,
  withScope: (scope, error, context) => {
    scope.setExtra('origin', context.request.headers.origin)
  },
})
```

## API & Configuration

```ts
export interface Options<Context> {
  sentryInstance?: Sentry
  config?: Sentry.NodeOptions
  withScope?: ExceptionScope<Context>
  captureReturnedErrors?: boolean
  forwardErrors?: boolean
  reportError?: (res: Error | any) => boolean
}

function sentry<Context>(options: Options<Context>): IMiddlewareFunction
```

### Sentry context

To enrich events sent to Sentry, you can modify the [context](https://docs.sentry.io/enriching-error-data/context/?platform=javascript).
This can be done using the `withScope` configuration option.

The `withScope` option is a function that is called with the current Sentry scope, the error, and the GraphQL Context.

```ts
type ExceptionScope<Context> = (
  scope: Sentry.Scope,
  error: Error,
  context: Context,
) => void
```

### Filtering Out Custom Errors

To filter out custom errors thrown by your server (such as "You Are Not Logged In"), use the `reportError` option and return a boolean for whether or not the error should be sent to sentry.

```ts
class CustomError extends Error {}

const sentryMiddleware = sentry({
  reportError: (res) => {
    // you can check the error message strings
    if (res.message === 'You Are Not Logged In') {
      return false;
    }

    // or extend the error type and create a custom error
    if (res instanceof CustomError) {
      return false;
    }

    return true;
  }
})
```



### Options

| property                | required | description                                                                                                                                                                |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sentryInstance`        | false    | [Sentry's instance](https://docs.sentry.io/error-reporting/configuration/?platform=node)                                                                                   |
| `config`                | false    | [Sentry's config object](https://docs.sentry.io/error-reporting/configuration/?platform=node)                                                                              |
| `withScope`             | false    | Function to modify the [Sentry context](https://docs.sentry.io/enriching-error-data/context/?platform=node) to send with the captured error.                               |
| `captureReturnedErrors` | false    | Capture errors returned from other middlewares, e.g., `graphql-shield` [returns errors](https://github.com/maticzav/graphql-shield#custom-errors) from rules and resolvers |
| `forwardErrors`         | false    | Should middleware forward errors to the client or block them.                                                                                                              |
| `attachEventId` | false    | Attach Sentry event id to the error object on 'errorId' |
| `reportError` | false | Function that passes `res` as the parameter and accepts a boolean callback for whether or not the error should be captured

#### Note

If `sentryInstance` is not passed then `config.dsn` is required and vice-versa.

## License

This project is licensed under the [MIT License](LICENSE.md).
