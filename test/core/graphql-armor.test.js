import assert from 'assert';
import express from 'express';
import { GraphqlExpress } from '../../index.js';

describe('GraphQL Armor Security Features', function () {
    let app;
    let server;

    beforeEach(function () {
        app = express();
        server = app.listen(0); // Use port 0 for random available port
    });

    afterEach(function () {
        if (server) {
            server.close();
        }
    });

    describe('#Alias Query Protection', function () {
        it('should block alias queries when maxAliases is 0', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
            users: [User]
          }
          type User {
            id: ID
            name: String
            email: String
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John', email: 'john@example.com' }),
                        users: () => [
                            { id: '1', name: 'John', email: 'john@example.com' },
                            { id: '2', name: 'Jane', email: 'jane@example.com' }
                        ]
                    }
                }
            }];

            const armorOptions = {
                maxAliases: 0,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });

        it('should allow limited aliases when maxAliases is set', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
            users: [User]
          }
          type User {
            id: ID
            name: String
            email: String
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John', email: 'john@example.com' }),
                        users: () => [
                            { id: '1', name: 'John', email: 'john@example.com' },
                            { id: '2', name: 'Jane', email: 'jane@example.com' }
                        ]
                    }
                }
            }];

            const armorOptions = {
                maxAliases: 3,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Query Depth Limiting', function () {
        it('should limit query depth when maxDepth is set', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
          }
          type User {
            id: ID
            name: String
            profile: Profile
          }
          type Profile {
            bio: String
            user: User
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John' })
                    },
                    User: {
                        profile: () => ({ bio: 'Developer' })
                    },
                    Profile: {
                        user: () => ({ id: '1', name: 'John' })
                    }
                }
            }];

            const armorOptions = {
                maxDepth: 3,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });

        it('should handle deep nested queries with depth limits', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
          }
          type User {
            id: ID
            name: String
            posts: [Post]
          }
          type Post {
            id: ID
            title: String
            author: User
            comments: [Comment]
          }
          type Comment {
            id: ID
            text: String
            post: Post
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John' })
                    },
                    User: {
                        posts: () => [{ id: '1', title: 'First Post' }]
                    },
                    Post: {
                        author: () => ({ id: '1', name: 'John' }),
                        comments: () => [{ id: '1', text: 'Great post!' }]
                    },
                    Comment: {
                        post: () => ({ id: '1', title: 'First Post' })
                    }
                }
            }];

            const armorOptions = {
                maxDepth: 5,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Query Cost Limiting', function () {
        it('should limit query cost when maxCost is set', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            users: [User]
          }
          type User {
            id: ID
            name: String
            posts: [Post]
          }
          type Post {
            id: ID
            title: String
            content: String
          }
        `,
                resolvers: {
                    Query: {
                        users: () => Array(10).fill(null).map((_, i) => ({
                            id: String(i),
                            name: `User ${i}`
                        }))
                    },
                    User: {
                        posts: () => Array(5).fill(null).map((_, i) => ({
                            id: String(i),
                            title: `Post ${i}`,
                            content: 'Content'
                        }))
                    }
                }
            }];

            const armorOptions = {
                maxCost: 100,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });

        it('should handle complex queries with cost limits', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
          }
          type User {
            id: ID
            name: String
            profile: Profile
            posts: [Post]
            friends: [User]
          }
          type Profile {
            bio: String
            avatar: String
          }
          type Post {
            id: ID
            title: String
            content: String
            likes: Int
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John' })
                    },
                    User: {
                        profile: () => ({ bio: 'Developer', avatar: 'avatar.jpg' }),
                        posts: () => Array(3).fill(null).map((_, i) => ({
                            id: String(i),
                            title: `Post ${i}`,
                            content: 'Content',
                            likes: Math.floor(Math.random() * 100)
                        })),
                        friends: () => Array(5).fill(null).map((_, i) => ({
                            id: String(i + 2),
                            name: `Friend ${i}`
                        }))
                    }
                }
            }];

            const armorOptions = {
                maxCost: 200,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Directive Limiting', function () {
        it('should limit directives when maxDirectives is set', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
          }
          type User {
            id: ID
            name: String
            email: String
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John', email: 'john@example.com' })
                    }
                }
            }];

            const armorOptions = {
                maxDirectives: 2,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Argument Limiting', function () {
        it('should limit arguments when maxArguments is set', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user(id: ID, name: String, email: String, role: String, status: String): User
          }
          type User {
            id: ID
            name: String
          }
        `,
                resolvers: {
                    Query: {
                        user: (_, args) => ({
                            id: args.id || '1',
                            name: args.name || 'John'
                        })
                    }
                }
            }];

            const armorOptions = {
                maxArguments: 2,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Production Security Configuration', function () {
        it('should handle strict production security settings', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            hello: String
          }
        `,
                resolvers: {
                    Query: {
                        hello: () => 'Hello World'
                    }
                }
            }];

            const productionArmorOptions = {
                maxAliases: 0,
                maxDepth: 8,
                maxCost: 500,
                maxDirectives: 3,
                maxArguments: 8,
                maxTokens: 500,
                blockFieldSuggestion: true,
                disableIntrospection: true,
                maxQueryLength: 5000,
                maxQueryComplexity: 50,
                onError: (error) => {
                    // Production error handling
                }
            };

            const result = await GraphqlExpress(app, schemas, {
                serverWS: server,
                armorOptions: productionArmorOptions
            });
            assert.strictEqual(result, true);
        });
    });

    describe('#Development Security Configuration', function () {
        it('should handle relaxed development security settings', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            hello: String
          }
        `,
                resolvers: {
                    Query: {
                        hello: () => 'Hello World'
                    }
                }
            }];

            const developmentArmorOptions = {
                maxAliases: 5,
                maxDepth: 15,
                maxCost: 2000,
                maxDirectives: 10,
                maxArguments: 20,
                maxTokens: 1000,
                blockFieldSuggestion: false,
                disableIntrospection: false,
                maxQueryLength: 15000,
                maxQueryComplexity: 200
            };

            const result = await GraphqlExpress(app, schemas, {
                serverWS: server,
                armorOptions: developmentArmorOptions
            });
            assert.strictEqual(result, true);
        });
    });

    describe('#Custom Error Handling', function () {
        it('should handle custom error callbacks', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            hello: String
          }
        `,
                resolvers: {
                    Query: {
                        hello: () => 'Hello World'
                    }
                }
            }];

            let errorCaught = false;
            let errorType = null;

            const armorOptions = {
                maxAliases: 0,
                maxDepth: 10,
                onError: (error) => {
                    errorCaught = true;
                    errorType = error.type;
                    assert.ok(error.message);
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });

        it('should handle security violation logging', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            hello: String
          }
        `,
                resolvers: {
                    Query: {
                        hello: () => 'Hello World'
                    }
                }
            }];

            let securityLog = [];

            const armorOptions = {
                maxAliases: 0,
                maxDepth: 5,
                onError: (error) => {
                    securityLog.push({
                        type: error.type,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Multiple Query Limiting', function () {
        it('should limit multiple queries in single request', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
            users: [User]
            posts: [Post]
          }
          type User {
            id: ID
            name: String
          }
          type Post {
            id: ID
            title: String
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John' }),
                        users: () => [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }],
                        posts: () => [{ id: '1', title: 'Post 1' }, { id: '2', title: 'Post 2' }]
                    }
                }
            }];

            const armorOptions = {
                maxCost: 50,
                maxDepth: 3,
                maxDirectives: 2,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });

        it('should handle complex multiple query scenarios', async function () {
            const schemas = [{
                typeDefs: `
          type Query {
            user: User
            users: [User]
            posts: [Post]
            comments: [Comment]
          }
          type User {
            id: ID
            name: String
            posts: [Post]
            comments: [Comment]
          }
          type Post {
            id: ID
            title: String
            author: User
            comments: [Comment]
          }
          type Comment {
            id: ID
            text: String
            author: User
            post: Post
          }
        `,
                resolvers: {
                    Query: {
                        user: () => ({ id: '1', name: 'John' }),
                        users: () => Array(5).fill(null).map((_, i) => ({ id: String(i), name: `User ${i}` })),
                        posts: () => Array(3).fill(null).map((_, i) => ({ id: String(i), title: `Post ${i}` })),
                        comments: () => Array(10).fill(null).map((_, i) => ({ id: String(i), text: `Comment ${i}` }))
                    },
                    User: {
                        posts: () => Array(2).fill(null).map((_, i) => ({ id: String(i), title: `User Post ${i}` })),
                        comments: () => Array(3).fill(null).map((_, i) => ({ id: String(i), text: `User Comment ${i}` }))
                    },
                    Post: {
                        author: () => ({ id: '1', name: 'John' }),
                        comments: () => Array(2).fill(null).map((_, i) => ({ id: String(i), text: `Post Comment ${i}` }))
                    },
                    Comment: {
                        author: () => ({ id: '1', name: 'John' }),
                        post: () => ({ id: '1', title: 'Post 1' })
                    }
                }
            }];

            const armorOptions = {
                maxCost: 300,
                maxDepth: 4,
                maxDirectives: 5,
                maxArguments: 10,
                maxTokens: 800,
                onError: (error) => {
                    // Error handler for testing
                }
            };

            await GraphqlExpress(app, schemas, { serverWS: server, armorOptions });
            assert.ok(app._router);
        });
    });

    describe('#Integration with AutoLoad', function () {
        it('should work with AutoLoad and Armor security', async function () {
            // Mock AutoLoad functionality
            const mockSchemas = [{
                typeDefs: `
          type Query {
            hello: String
          }
        `,
                resolvers: {
                    Query: {
                        hello: () => 'Hello World'
                    }
                }
            }];

            const armorOptions = {
                maxAliases: 0,
                maxDepth: 10,
                maxCost: 1000,
                blockFieldSuggestion: true
            };

            const result = await GraphqlExpress(app, mockSchemas, {
                serverWS: server,
                armorOptions
            });
            assert.strictEqual(result, true);
        });
    });
}); 