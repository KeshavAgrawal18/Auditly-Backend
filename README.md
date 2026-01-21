# Auditly

A TypeScript Express.js boilerplate designed to explore **secure, scalable backend architecture** with tenant isolation and audit logging.

## Focus (Not Features)

This project is about understanding **real-world backend architecture**:

- Layered request flow
- Tenant isolation and data security
- Audit logs and traceability

## Features

- **TypeScript** - Strongly typed language for better developer experience
- **Authentication & Authorization** - JWT-based auth with refresh tokens
- **Database Integration** - Prisma ORM with MySQL
- **API Documentation** - REST client files for API testing
- **Security**
  - Helmet for security headers
  - Rate limiting
  - CORS configuration
  - Request validation using Zod
- **Monitoring & Logging**
  - Prometheus metrics
  - Grafana dashboards
  - Winston logger with daily rotate
  - Request ID tracking
- **Performance**
  - Response compression
  - Caching middleware
  - Database connection pooling
- **Testing**
  - Jest for unit and integration tests
  - E2E testing setup
  - Test helpers and utilities
- **Docker Support**
  - Multi-stage builds
  - Docker Compose for local development
  - Health checks
- **CI/CD**
  - GitHub Actions workflow
  - Automated testing
  - Docker image publishing

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- Docker and Docker Compose (optional)

## Getting Started

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/keshavagrawal18/auditly.git
cd auditly
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Set up the database:

```bash
npm run migrate:dev
npm run seed:dev
```

5. Start the development server:

```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── __tests__/        # Test files
│   ├── @types/          # TypeScript type definitions
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Request validation schemas
│   ├── app.ts          # Express app setup
│   └── index.ts        # Application entry point
├── prisma/             # Prisma schema and migrations
├── requests/           # REST client files
└── docker/            # Docker configuration files
```

## Request Flow (Architecture Highlight)

- **Controller:** Handles incoming requests and sends responses
- **Service:** Implements business logic and orchestrates operations
- **Repository:** Performs database operations and persistence

```mermaid
graph LR
    Client --> Controller
    Controller --> Service
    Service --> Repository
    Repository --> Database


```

> This shows the **layered architecture** of Auditly, demonstrating how requests are processed, logged, and persisted.

---

## Monitoring & Logging (High-Level)

- Audit logs for all key actions
- Request IDs to trace operations end-to-end
- Basic Prometheus metrics and logging infrastructure

> Detailed monitoring and dashboards are planned for later iterations — the focus here is **architecture and observability patterns**.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
