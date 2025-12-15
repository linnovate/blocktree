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
- [General Utilities](https://github.com/linnovate/blocktree/blob/v2-dev/docs/utils.md): Structured Logger (Pino), Fetch Client, JWT Parsing, and Dynamic Imports, and PromiseOnce.
- [Server Utilities](https://github.com/linnovate/blocktree/blob/v2-dev/docs/server.md): Express middlewares for security (Helmet/CORS), optimization, and Swagger auto-generation, and JwtSession session-handler.
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

## Local Development & Testing
This repository includes a `server.js` and `compose.yaml` file designed for **local development and testing** of the library features.

### License
This project is licensed under the MIT License.