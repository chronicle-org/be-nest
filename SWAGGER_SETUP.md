# Swagger API Documentation Setup

## Overview

Your Chronicle Backend API now has full Swagger/OpenAPI documentation. This guide explains how to access and use it.

## Accessing Swagger UI

Once your backend is running, you can access the interactive API documentation at:

```
http://localhost:8080/api/docs
```

Or if deployed to production:

```
https://api.chronicle.dev/api/docs  (replace with your actual domain)
```

## Features

✅ Full interactive API documentation
✅ Real-time request/response examples
✅ Bearer token authentication support
✅ Cookie-based authentication (for WebSocket)
✅ Try-it-out functionality to test endpoints directly
✅ Detailed parameter and response schemas

## Authentication in Swagger

The API supports two authentication methods:

### 1. Bearer Token (JWT)
- Used for HTTP endpoints
- After logging in, copy the JWT token from the response
- Click the "Authorize" button in Swagger UI
- Paste the token in the Bearer auth field (format: `Bearer <token>`)

### 2. Cookie Authentication
- Automatically handled for logged-in sessions
- The `chronicle_access_token` cookie is set by the `/auth/login` endpoint
- Persists across requests in the browser

## API Endpoints Documentation

### Authentication (`/auth`)
- **POST /auth/login** - Login with email and password
- **POST /auth/register** - Register a new user
- **POST /auth/logout** - Logout (clears authentication cookie)

### Users (`/user`)
- **GET /user** - Get all users
- **GET /user/:id** - Get a specific user
- **POST /user** - Create a new user
- **PUT /user** - Update current user profile
- **POST /user/follow/:user_id** - Follow a user
- **POST /user/unfollow/:user_id** - Unfollow a user
- **GET /user/following/:user_id** - Get users that a user is following
- **GET /user/followers/:user_id** - Get followers of a user
- **GET /user/likes/:user_id** - Get posts liked by a user
- **GET /user/bookmarks/:user_id** - Get bookmarked posts by a user

### Posts (`/post`)
- **GET /post** - Get all posts (paginated)
- **GET /post/user/:user_id** - Get posts by a specific user
- **GET /post/:id** - Get a specific post
- **POST /post** - Create a new post
- **PUT /post/:id** - Update a post
- **DELETE /post/:id** - Delete a post
- **PUT /post/:id/publish** - Publish a draft post
- **PUT /post/interaction/:action_type/:post_id** - Like/bookmark/unlike/unbookmark a post
- **PUT /post/counter/:action/:post_id** - Increment view/share counters

### Comments (`/comment`)
- **POST /comment** - Create a comment on a post
- **PUT /comment/:id** - Update a comment
- **GET /comment/post/:post_id** - Get all comments on a post
- **GET /comment/user/:user_id** - Get all comments by a user
- **DELETE /comment/:id** - Delete a comment

### Notifications (`/notifications`)
- **GET /notifications** - Get user's notifications (paginated)
- **DELETE /notifications/:id** - Delete a notification
- **PUT /notifications/read** - Mark notifications as read
- **GET /notifications/settings** - Get notification preferences
- **PUT /notifications/settings** - Update notification preferences

## Query Parameters

### Pagination
Most list endpoints support these query parameters:
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20, max: 50)

### Search
List endpoints support:
- `search` (string) - Search query for filtering results

## Environment Setup

The Swagger documentation is automatically configured with:
- **Development**: http://localhost:8080
- **Production**: https://api.chronicle.dev (update in `main.ts`)

To add more environments, modify the `main.ts` file:

```typescript
.addServer("https://staging.api.chronicle.dev", "Staging")
```

## Development

The Swagger UI is generated using:
- `@nestjs/swagger` - NestJS Swagger plugin
- `swagger-ui-express` - Swagger UI middleware

### Adding Documentation to New Endpoints

When creating new endpoints, use these decorators:

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags("MyFeature")
@Controller("my-feature")
export class MyFeatureController {
  @ApiOperation({ summary: "Short description" })
  @ApiResponse({ status: 200, description: "Success response description" })
  @ApiBearerAuth("access-token")
  @Get()
  findAll() {
    return [];
  }
}
```

### Adding Documentation to DTOs

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class MyDto {
  @ApiProperty({
    example: "example-value",
    description: "Field description",
  })
  fieldName: string;
}
```

## Tips & Tricks

1. **Save Authorization**: Check "Authorize using credentials" to save your token for the session
2. **Try it out**: Use the "Try it out" button to test endpoints directly
3. **Response Examples**: Every endpoint shows real-world response examples
4. **Parameter Validation**: Required parameters are marked with asterisks
5. **Download OpenAPI JSON**: The full OpenAPI spec is available at `/api/docs-json`

## Troubleshooting

### Swagger not loading?
- Make sure your backend is running on port 8080 (or your configured port)
- Clear your browser cache
- Try accessing http://localhost:8080/api/docs in an incognito window

### Authentication not working?
- First, use the `/auth/login` endpoint to get a token
- Click the "Authorize" button in the top-right
- Select the authentication method (Bearer token or Cookie)
- Paste your token and click "Authorize"

### CORS issues?
- Make sure your backend has CORS enabled
- Check that your frontend origin is in the `CORS_ORIGIN` environment variable

## Production Deployment

For production:
1. Update the `.addServer()` calls in `main.ts` with your production domain
2. Set `NODE_ENV=production` to enable secure cookies
3. Ensure `JWT_SECRET` and `CORS_ORIGIN` environment variables are set
4. Optional: Disable Swagger UI in production by wrapping it with an environment check:

```typescript
if (process.env.NODE_ENV !== "production") {
  SwaggerModule.setup("api/docs", app, document);
}
```

## References

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
