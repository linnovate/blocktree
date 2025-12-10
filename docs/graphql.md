## Functions

<dl>
<dt><a href="#GraphqlClient">GraphqlClient(url, options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Graphql Client - Executes a GraphQL operation (Query/Mutation) via HTTP POST.</p>
<ul>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:GraphqlClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#GraphqlServer">GraphqlServer(app, schemas, options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Graphql Server - Sets up GraphQL middleware using GraphQL Yoga.</p>
<ul>
<li>Mounts the GraphQL endpoint at <code>/graphql</code>.</li>
<li>Includes default <code>health</code> Query/Mutation/Subscription and a <code>/graphql/health</code> endpoint.</li>
<li>Uses default envs <code>NODE_ENV</code> to determine dev/prod mode.</li>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:GraphqlServer</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
</dl>

<a name="GraphqlClient"></a>

## GraphqlClient(url, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Graphql Client - Executes a GraphQL operation (Query/Mutation) via HTTP POST.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:GraphqlClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The Fetch Response object (populated with a parsed `.data` property by FetchClient).  
**Requires**: <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The GraphQL endpoint URL. |
| options | <code>Object</code> | GraphQL request options. |
| options.query | <code>string</code> | The GraphQL query or mutation string. [https://graphql.org/learn/queries](https://graphql.org/learn/queries) |
| options.variables | <code>Object</code> \| <code>null</code> | The variables object to accompany the query. [https://graphql.org/learn/queries/#variables](https://graphql.org/learn/queries/#variables) |
| options.authToken | <code>string</code> \| <code>null</code> | The value for the `Authorization` header (e.g., "Bearer <token>"). [https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization) |
| ...options | <code>Object</code> \| <code>null</code> | Additional standard fetch options (e.g., `headers`, `cors`). |

**Example**  
```js
import { GraphqlClient } from '@linnovate/blocktree';
const { ok, status, data } = await GraphqlClient('http://localhost:5000/graphql', { query: '{health}', variables: {}, authToken: 'MY_TOKEN' })
console.log('GraphqlClient:', { ok, status, data });
```
<a name="GraphqlServer"></a>

## GraphqlServer(app, schemas, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Graphql Server - Sets up GraphQL middleware using GraphQL Yoga.
- Mounts the GraphQL endpoint at `/graphql`.
- Includes default `health` Query/Mutation/Subscription and a `/graphql/health` endpoint.
- Uses default envs `NODE_ENV` to determine dev/prod mode.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:GraphqlServer` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized Yoga server instance.  
**Requires**: <code>module:graphql@^16</code>, <code>module:graphql-yoga@^5</code>, <code>module:@graphql-yoga/plugin-disable-introspection@^2</code>, <code>module:@escape.tech/graphql-armor@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| app | <code>Object</code> |  | The express application instance. |
| schemas | <code>Array.&lt;Object&gt;</code> \| <code>null</code> |  | Array of schema definitions to merge. |
| schemas[].directives | <code>Array.&lt;Object&gt;</code> \| <code>null</code> |  | Array of directive objects to apply to the schema. |
| schemas[].directives[].typeDefs | <code>string</code> \| <code>null</code> |  | The type definitions for the directive. [https://spec.graphql.org/draft/#sec-Type-System.Directives](https://spec.graphql.org/draft/#sec-Type-System.Directives) |
| schemas[].directives[].transformer | <code>function</code> \| <code>null</code> |  | Function to apply directive logic to the schema. [https://the-guild.dev/graphql/tools/docs/schema-directives#imp](https://the-guild.dev/graphql/tools/docs/schema-directives#imp) |
| schemas[].typeDefs | <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code> |  | The GraphQL type definitions. [https://graphql.org/learn/schema](https://graphql.org/learn/schema) |
| schemas[].resolvers | <code>Object</code> \| <code>null</code> \| <code>Array.&lt;Object&gt;</code> |  | The resolver map object(s). [https://graphql.org/learn/execution](https://graphql.org/learn/execution) [https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions) |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.isDev | <code>boolean</code> \| <code>null</code> | <code>process.env.NODE_ENV</code> | !== 'production' - Development mode flag. |
| options.autoLoadDirs | <code>Object</code> \| <code>null</code> |  | Configuration for auto-loading schema files. |
| options.autoLoadDirs.typeDefs | <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code> |  | Path(s) to typeDefs directories. |
| options.autoLoadDirs.resolvers | <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code> |  | Path(s) to resolvers directories. |
| options.autoLoadDirs.directives | <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code> |  | Path(s) to directives directories. |
| options.armorOptions | <code>Object</code> \| <code>null</code> |  | Options for `module:@escape.tech/graphql-armor`. [https://www.npmjs.com/package/@escape.tech/graphql-armor](https://www.npmjs.com/package/@escape.tech/graphql-armor) |
| options.plugins | <code>Array.&lt;Object&gt;</code> \| <code>null</code> |  | Additional GraphQL Yoga plugins. |
| ...options | <code>\*</code> \| <code>null</code> |  | Additional options passed to `module:graphql-yoga`. [https://www.npmjs.com/package/graphql-yoga](https://www.npmjs.com/package/graphql-yoga) |

**Example**  
```js
import { GraphqlServer } from '@linnovate/blocktree';
GraphqlServer(app);
```
