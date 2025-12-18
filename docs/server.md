## Functions

<dl>
<dt><a href="#JwtSessionExpress">JwtSessionExpress(app, options)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Jwt Session Express - Initializes a reactive session object on the request.</p>
<ul>
<li>Sets up middleware that hydrates the session from a JWT (found in headers or cookies) and saves changes automatically via a Proxy.</li>
<li>Attaches a reactive Proxy object to <code>req.jwtSession</code>.</li>
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
Jwt Session Express - Initializes a reactive session object on the request.
- Sets up middleware that hydrates the session from a JWT (found in headers or cookies) and saves changes automatically via a Proxy.
- Attaches a reactive Proxy object to `req.jwtSession`.

**Kind**: global function  
**Requires**: <code>module:jsonwebtoken@^9</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>Object</code> | The express application instance. |
| options | <code>Object</code> | Additional options passed to `JwtSession` function. [JwtSession Options Documentation](https://github.com/linnovate/blocktree/blob/v2-dev/docs/utils.md#JwtSession) |

**Example**  
```js
import { JwtSessionExpress } from '@linnovate/blocktree';
await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
app.get('/profile', (req, res) => {
  console.log(req.jwtSession.last_visit);
  req.jwtSession.last_visit = new Date();
  res.send('Session updated');
});
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
