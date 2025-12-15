## Functions

<dl>
<dt><a href="#JwtSessionExpress">JwtSessionExpress(app, options)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Jwt Session Express - Creates the Express middleware logic for handling JWT sessions.</p>
<ul>
<li>Uses default envs: <code>JWT_SECRET_KEY</code>, <code>DEBUG</code>.</li>
<li>Decodes the secret key if base64 encoded.</li>
<li>Includes comprehensive logging cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:JwtSessionExpress</code> or <code>DEBUG=blocktree</code> or <code>DEBUG=blocktree:*</code> to ignore <code>DEBUG=-blocktree:Server</code></li>
</ul>
</dd>
<dt><a href="#OptimizeExpress">OptimizeExpress(app, options)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Optimize Express - Sets up compression and other optimization middleware.</p>
<ul>
<li>To enable debug logs set env: <code>DEBUG=blocktree:OptimizeExpress</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#SecurityExpress">SecurityExpress(app, options)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Security Express - Configures essential security middleware for the application.</p>
<ul>
<li>To enable debug logs set env: <code>DEBUG=blocktree:SecurityExpress</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#SwaggerExpress">SwaggerExpress(app, options)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Swagger Express - Auto-generate and serve Swagger UI for Express applications.</p>
<ul>
<li>To enable debug logs set env: <code>DEBUG=blocktree:SwaggerExpress</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
</dl>

<a name="JwtSessionExpress"></a>

## JwtSessionExpress(app, options) ⇒ <code>Promise.&lt;void&gt;</code>
Jwt Session Express - Creates the Express middleware logic for handling JWT sessions.
- Uses default envs: `JWT_SECRET_KEY`, `DEBUG`.
- Decodes the secret key if base64 encoded.
- Includes comprehensive logging cycles.
- To enable debug logs set env: `DEBUG=blocktree:JwtSessionExpress` or `DEBUG=blocktree` or `DEBUG=blocktree:*` to ignore `DEBUG=-blocktree:Server`

**Kind**: global function  
**Requires**: <code>module:jsonwebtoken@^9</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| app | <code>Object</code> |  | The express application instance. |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| [options.JWT_SECRET_KEY] | <code>string</code> | <code>&quot;process.env.JWT_SECRET_KEY&quot;</code> | The secret key used to sign the token. |
| [options.headerKey] | <code>string</code> | <code>&quot;&#x27;Authorization&#x27;&quot;</code> | The header key to look for the token (e.g., 'Authorization'). |
| [options.cookieKey] | <code>string</code> | <code>&quot;&#x27;token&#x27;&quot;</code> | The name of the cookie used to store the token. |
| [options.reqKey] | <code>string</code> | <code>&quot;&#x27;jwtSession&#x27;&quot;</code> | The key on the request object where the session data will be attached. |
| [options.verifyOptions] | <code>Object</code> |  | Options passed to `jwt.verify`. [https://www.npmjs.com/package/jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) |
| [options.signOptions] | <code>Object</code> |  | Options passed to `jwt.sign`. [https://www.npmjs.com/package/jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) |
| [options.cookieOptions] | <code>Object</code> |  | Additional options passed to `res.cookie`. |

**Example**  
```js
import { JwtSessionExpress } from '@linnovate/blocktree';
await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
```
<a name="OptimizeExpress"></a>

## OptimizeExpress(app, options) ⇒ <code>Promise.&lt;void&gt;</code>
Optimize Express - Sets up compression and other optimization middleware.
- To enable debug logs set env: `DEBUG=blocktree:OptimizeExpress` or `DEBUG=blocktree`

**Kind**: global function  
**Requires**: <code>module:compression@^1</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>Object</code> | The express application instance. |
| options | <code>Object</code> \| <code>null</code> | Configuration options. |
| options.compressionOptions | <code>Object</code> \| <code>null</code> | Options to pass to the `module:compression`. [https://www.npmjs.com/package/compression](https://www.npmjs.com/package/compression) |

**Example**  
```js
import { OptimizeExpress } from '@linnovate/blocktree';
await OptimizeExpress(app)
```
<a name="SecurityExpress"></a>

## SecurityExpress(app, options) ⇒ <code>Promise.&lt;void&gt;</code>
Security Express - Configures essential security middleware for the application.
- To enable debug logs set env: `DEBUG=blocktree:SecurityExpress` or `DEBUG=blocktree`

**Kind**: global function  
**Requires**: <code>module:helmet@^8</code>, <code>module:cors@^2</code>, <code>module:express-rate-limit@^8</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>Object</code> | The express application instance. |
| options | <code>Object</code> \| <code>null</code> | Configuration options. |
| options.corsOptions | <code>String</code> \| <code>null</code> | Options to pass to the `module:cors`. [https://www.npmjs.com/package/cors#configuring-cors](https://www.npmjs.com/package/cors#configuring-cors) |
| options.helmetOptions | <code>String</code> \| <code>null</code> | Options to pass to the `module:helmet`. [https://www.npmjs.com/package/helmet](https://www.npmjs.com/package/helmet) |
| options.rateLimitOptions | <code>String</code> \| <code>null</code> | Options to pass to the `module:express-rate-limit`. [https://www.npmjs.com/package/express-rate-limit](https://www.npmjs.com/package/express-rate-limit) |

**Example**  
```js
import { SecurityExpress } from '@linnovate/blocktree';
await SecurityExpress(app);
```
<a name="SwaggerExpress"></a>

## SwaggerExpress(app, options) ⇒ <code>Promise.&lt;void&gt;</code>
Swagger Express - Auto-generate and serve Swagger UI for Express applications.
- To enable debug logs set env: `DEBUG=blocktree:SwaggerExpress` or `DEBUG=blocktree`

**Kind**: global function  
**Requires**: <code>module:swagger-ui-express@^5</code>, <code>module:swagger-jsdoc@^6</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| app | <code>Object</code> |  | The express application instance. |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.SWAGGER_PATH | <code>String</code> \| <code>null</code> | <code>/api-docs</code> | The URL route to serve the swagger UI. |
| options.swaggerUIOptions | <code>Object</code> \| <code>null</code> |  | Options to pass to `module:swagger-ui-express`. [https://www.npmjs.com/package/swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) |
| options.swaggerJsdocOptions | <code>Object</code> \| <code>null</code> |  | Options to pass to `module:swagger-jsdoc`. [https://www.npmjs.com/package/swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc) |

**Example**  
```js
import { SwaggerExpress } from '@linnovate/blocktree';
await SwaggerExpress(app);
```
