# @linnovate/blocktree
Blocktree Core is a suite of robust, standardized tools for Node.js developers. It simplifies the creation of microservices and applications by providing pre-configured wrappers for common infrastructure (databases, logging, security, APIs) with a focus on uniform logging, environment variable configuration, and best practices.


## Installation
```bash
yarn add @linnovate/blocktree
# or
npm install @linnovate/blocktree
```

## Documentation
Detailed documentation for each module can be found in the `docs/` folder:
- [General Utilities](https://github.com/linnovate/blocktree/blob/v2-dev/docs/utils.md): Structured Logger (Pino), Fetch Client, JWT Parsing, and Dynamic Imports, and PromiseOnce, and JwtSession session-handler.
- [Server Utilities](https://github.com/linnovate/blocktree/blob/v2-dev/docs/server.md): Express middlewares for security (Helmet/CORS), optimization, and Swagger auto-generation, and JwtSessionExpress session-handler.
- [GraphQL](https://github.com/linnovate/blocktree/blob/v2-dev/docs/graphql.md): Yoga Server setup, Clients, and Security (Armor).
- [MongoDB](https://github.com/linnovate/blocktree/blob/v2-dev/docs/mongo.md): Client connection and Zero-Downtime Indexing (Blue/Green deployment).
- [Elasticsearch / OpenSearch](https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md): Clients and Zero-Downtime Indexing utilities.
- [Services](https://github.com/linnovate/blocktree/blob/v2-dev/docs/services.md): Clients for Redis, MySQL, RabbitMQ, S3/Google Storage, JSON:API, and Mailer.

## Quick Start

#### 1. Basic Server Setup
Blocktree helps you bootstrap an Express server with security, optimization, and documentation in just a few lines.

```js
import express from 'express';
import { 
  Logger, 
  SecurityExpress, 
  OptimizeExpress, 
  SwaggerExpress 
} from '@linnovate/blocktree';

const app = express();
app.listen(3000, () => console.log('Server running on port 3000'));

// Initialize Logger
await Logger({ LOG_SERVICE_NAME: 'my-service', DEBUG: 'blocktree:*' });

// Apply standard middleware
SecurityExpress(app); // Helmet, CORS, RateLimiter
OptimizeExpress(app); // Compression
SwaggerExpress(app);  // Auto-generated API docs at /api-docs
```

#### 2. Database Connection (Singleton Pattern)
Blocktree helps you bootstrap an Express server with security, optimization, and documentation in just a few lines.

```js
import { MongoClient, RedisClient } from '@linnovate/blocktree';

// Connect to Mongo (uses process.env.MONGO_URI)
const mongo = await MongoClient();
const db = mongo.db('my-db');

// Connect to Redis (uses process.env.REDIS_URI)
const redis = await RedisClient();
await redis.set('foo', 'bar');
```

### Local Development & Testing
This repository includes a `server.js` and `compose.yaml` file designed for **local development and testing** of the library features.

## Release Notes: v2.0.0
Version 2.0.0 represents a significant architectural overhaul of the Blocktree core. This release focuses on modernizing the codebase for Node.js 24+, improved project structure, advanced logging capabilities with namespace support, and enhanced zero-downtime indexing strategies for databases.

### Breaking Changes
- **Node.js Requirement:** The minimum required Node.js version is now >=24.0.0.
- **Removed Modules:**
  - `OpenIdExpress`: This module has been removed from the core package.
  - `AutoLoad`: The standalone tool has been removed; auto-loading logic is now built directly into specific services like `GraphqlServer`.
- **Renamed/Replaced Functions:**
  - `GraphqlExpress` is replaced by `GraphqlServer`.
  - `ElasticIndexerExpress` and `MongoIndexerExpress` are removed in favor of using `ElasticIndexer` and `MongoIndexer` tools directly or creating custom routes.
- **Logging Configuration:** The `Logger` no longer relies on `LOG_LEVEL`. It now uses the standard `DEBUG` environment variable (e.g., `DEBUG=blocktree:*`) to control verbosity and namespaces.

### New Features
- **JwtSessionExpress:** A new middleware that handles session management using JWTs stored in cookies with reactive Proxy support for automatic re-signing.
- **PromiseOnce:** Added `PromiseOnce`, a utility to prevent multiple concurrent executions of the same asynchronous operation (caching in-flight promises).
- **OptimizeExpress:** Compression logic has been extracted from SecurityExpress into its own dedicated module.
- **Rate Limiting:** `SecurityExpress` now includes `express-rate-limit` by default.
- **GraphQL Yoga v5**: Upgraded underlying engine to Yoga v5.
- **GraphQL Armor**: Integrated `@escape.tech/graphql-armor` for built-in security and protection against malicious queries.
- **Auto-Loading**: `GraphqlServer` now natively supports auto-loading typeDefs, resolvers, and directives from specified directories.

### Improvements & Refactoring
**Logger & Debugging** The logging system has been completely rewritten:
- **Namespaces:** Logs are now categorized by namespaces (e.g., `logger.debug('Some text', { namespace='MongoClient' })`).
- **Configuration:** Controlled via `DEBUG` env var (supports wildcards like `blocktree:*` or exclusions like `-blocktree:Server`).
- **Integration:** All clients (Mongo, Elastic, Fetch, Redis) now automatically log request/response cycles with high detail in debug mode.

**Database Clients**
- **Singleton Pattern:** Clients (`MongoClient`, `RedisClient`, `ElasticClient`, etc.) are now robust singletons keyed by their connection strings/options.
- **Mocking:** Enhanced mocking support for testing (using `mongodb-memory-server` and `@elastic/elasticsearch-mock`).
- **Logging:** Deep integration with the new Logger to trace commands, queries, and execution time.

### Migration Guide

#### **1. Updating Logger**

```javascript
// v1.5.0:
// .env: LOG_LEVEL=info
await Logger({ setupOptions: { ... } });

// v2.0.0:
// .env: DEBUG=blocktree:*
import { Logger } from '@linnovate/blocktree';
await Logger({ LOG_SERVICE_NAME: 'my-service' });
```

#### **2. Setting up GraphQL**
```javascript
// v1.5.0 (`GraphqlExpress`):
GraphqlExpress(app, schemas, { serverWS, yogaOptions });

// v2.0.0 (`GraphqlServer`):
import { GraphqlServer } from '@linnovate/blocktree';
GraphqlServer(app, schemas, { ...yogaOptions });
```

#### **3. Server Middleware**
```javascript
// v1.5.0:
SecurityExpress(app, { corsOptions, helmetOptions });

// v2.0.0:
import { SecurityExpress, OptimizeExpress } from '@linnovate/blocktree';
SecurityExpress(app); // Helmet, CORS, RateLimit
OptimizeExpress(app); // Compression (Separate call)
```


#### **4. Indexer Callbacks (`ElasticIndexer` & `MongoIndexer`)**
The function signatures for batchCallback and testCallback have changed from using positional arguments to a single object argument. This improves extensibility and consistency.
```javascript
// v1.5.0:
const reports = await (ElasticIndexer||MongoIndexer)(
  { ... },
  async (offset, config, reports) => [],
  async (config, reports) => true
);

// v2.0.0:
const status = await (ElasticIndexer||MongoIndexer)(
   { ... },
  async ({ offset, index, mode, response }) => [],
  async ({ index, activeIndexName }) => true,
);
```

### License
This project is licensed under the MIT License.