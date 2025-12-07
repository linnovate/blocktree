## Functions

<dl>
<dt><a href="#DynamicImport">DynamicImport(moduleName)</a> ⇒ <code>Promise.&lt;(Object|null)&gt;</code></dt>
<dd><p>DynamicImport - Dynamically imports a module and optionally validates the installed version.</p>
</dd>
<dt><a href="#FetchClient">FetchClient(url, options)</a> ⇒ <code>Promise.&lt;any&gt;</code></dt>
<dd><p>Fetch Client - A robust wrapper around the global fetch API</p>
<ul>
<li>This function performs a network request and automatically parses the response body into a <code>data</code> property on the Response object.</li>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:FetchClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#JWTParser">JWTParser(token, JWT_SECRET_KEY, options)</a> ⇒ <code>Promise.&lt;(Object|null)&gt;</code></dt>
<dd><p>JWT Parser - Verifies and decodes a JWT token.</p>
<ul>
<li>Uses default envs: <code>JWT_SECRET_KEY</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:JWTParser</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#Logger">Logger(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Logger - Singleton logger instance.</p>
<ul>
<li>Uses default envs: <code>LOG_SERVICE_NAME</code>, <code>DEBUG</code>.</li>
<li>Includes comprehensive logging for request <code>Server</code> cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:Server</code> or <code>DEBUG=blocktree</code> or <code>DEBUG=blocktree:*</code> to ignore <code>DEBUG=-blocktree:Server</code></li>
</ul>
</dd>
</dl>

<a name="DynamicImport"></a>

## DynamicImport(moduleName) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
DynamicImport - Dynamically imports a module and optionally validates the installed version.

**Kind**: global function  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - A Promise that resolves to the module namespace object, or `null` if the import failed.  

| Param | Type | Description |
| --- | --- | --- |
| moduleName | <code>string</code> | The package name, optionally followed by '@' and a minimum version (e.g., 'moduleName', 'moduleName@8.0.0', '@scope/moduleName@^1.2'). |

**Example**  
```js
const { default: module } = await DynamicImport('moduleName@^10');
```
<a name="FetchClient"></a>

## FetchClient(url, options) ⇒ <code>Promise.&lt;any&gt;</code>
Fetch Client - A robust wrapper around the global fetch API
- This function performs a network request and automatically parses the response body into a `data` property on the Response object.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:FetchClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;any&gt;</code> - A Promise that resolves to a standard `Response` object decorated with a `data` property containing the parsed body (JSON or text), or a custom error object on network/CORS failure.  
**Requires**: <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> \| <code>null</code> | The URL to which the request is made. |
| options | <code>Object</code> \| <code>null</code> | Standard fetch options, extended with custom properties. |
| options.logPrefix | <code>string</code> \| <code>null</code> | A string prefix to add to all internal log messages (e.g., `[my-service]`). |
| ...options | <code>Object</code> \| <code>null</code> | Additional standard fetch options (e.g., `method`, `headers`, `body`). |

**Example**  
```js
const { ok, status, data } = await FetchClient('[host]/api');
console.log({ ok, status, data });
```
<a name="JWTParser"></a>

## JWTParser(token, JWT_SECRET_KEY, options) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
JWT Parser - Verifies and decodes a JWT token.
- Uses default envs: `JWT_SECRET_KEY`.
- To enable debug logs set env: `DEBUG=blocktree:JWTParser` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - The decoded token payload if successful, or null if verification fails.  
**Requires**: <code>module:jsonwebtoken@^9</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>string</code> |  | The JWT string to verify and parse. |
| JWT_SECRET_KEY | <code>string</code> | <code>&quot;process.env.JWT_SECRET_KEY&quot;</code> | The secret key used to sign the token. |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options for jwt.verify. [https://www.npmjs.com/package/jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) |

**Example**  
```js
const jwtParsed = await JWTParser(token);
console.log( jwtParsed );
```
<a name="Logger"></a>

## Logger(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Logger - Singleton logger instance.
- Uses default envs: `LOG_SERVICE_NAME`, `DEBUG`.
- Includes comprehensive logging for request `Server` cycles.
- To enable debug logs set env: `DEBUG=blocktree:Server` or `DEBUG=blocktree` or `DEBUG=blocktree:*` to ignore `DEBUG=-blocktree:Server`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized Pino instance.  
**Requires**: <code>module:pino@^10</code>, <code>module:pino-pretty@^13</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.DEBUG | <code>string</code> \| <code>null</code> | <code>&quot;process.env.DEBUG&quot;</code> | Debug namespaces string (e.g., "blocktree:*, -blocktree:Server"). [https://www.npmjs.com/package/debug](https://www.npmjs.com/package/debug) |
| options.LOG_SERVICE_NAME | <code>string</code> \| <code>null</code> | <code>&quot;process.env.LOG_SERVICE_NAME&quot;</code> | The name of the service to appear in logs. |
| options.server | <code>Object</code> \| <code>null</code> |  | An http server instance to attach request logging to. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard pino options. [https://www.npmjs.com/package/pino](https://www.npmjs.com/package/pino) |

**Example**  
```js
const logger = await Logger();
logger.info('User logged in', { userId: 123 });
```
