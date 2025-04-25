# Development Guide

This document provides detailed information about the technologies, extensions, and development setup needed to contribute to the API and Kafka Testing Tool.

## Technology Stack

### Core Technologies
- **Electron**: v28.0.0
- **React**: v18.2.0
- **TypeScript**: v5.0.0
- **Vite**: v5.0.0
- **MongoDB**: v6.0.0
- **Kafka**: v3.5.0

### Frontend Dependencies
```json
{
  "dependencies": {
    "@heroicons/react": "^2.0.18",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongodb": "^6.0.0",
    "kafkajs": "^2.2.0",
    "cors": "^2.8.5"
  }
}
```

## Development Environment Setup

### Required Tools
1. **Node.js and npm**
   - Install Node.js v14 or higher
   - Verify installation: `node --version` and `npm --version`

2. **MongoDB**
   - Install MongoDB Community Edition
   - Start MongoDB service
   - Default connection: `mongodb://localhost:27017`

3. **Kafka**
   - Install Apache Kafka
   - Start Zookeeper and Kafka servers
   - Default broker: `localhost:9092`

4. **VS Code Extensions**
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - MongoDB for VS Code
   - Kafka for VS Code

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Project Structure
```
├── src/
│   ├── components/
│   │   ├── tools/
│   │   │   ├── api-tester/
│   │   │   └── kafka-tester/
│   │   └── common/
│   ├── hooks/
│   ├── utils/
│   └── main/
├── public/
├── server/
│   ├── api/
│   │   ├── mongodb.ts
│   │   └── kafka.ts
│   └── server.ts
├── tests/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron.config.js
```

## Development Workflow

### 1. Setting Up the Development Environment
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Start development servers
npm run dev
```

### 2. Running Tests
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### 3. Building the Application
```bash
# Build for development
npm run build:dev

# Build for production
npm run build:prod
```

## Code Style Guidelines

### TypeScript
- Use strict type checking
- Avoid `any` type
- Use interfaces for object shapes
- Use type guards for type narrowing

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Use proper prop types
- Follow the single responsibility principle

### State Management
- Use React's useState and useEffect for local state
- Use Context API for global state
- Implement proper error handling
- Use proper loading states

## API Development

### MongoDB API
- Use proper connection pooling
- Implement proper error handling
- Use proper indexing
- Implement proper validation

### Kafka API
- Use proper consumer groups
- Implement proper error handling
- Use proper message serialization
- Implement proper monitoring

## Testing Guidelines

### Unit Tests
- Use Jest for unit testing
- Test all utility functions
- Test all hooks
- Test all components

### Integration Tests
- Use Jest for integration testing
- Test API endpoints
- Test database operations
- Test Kafka operations

### E2E Tests
- Use Playwright for E2E testing
- Test user flows
- Test error scenarios
- Test performance

## Performance Considerations

### Frontend
- Use proper code splitting
- Implement proper caching
- Use proper lazy loading
- Implement proper error boundaries

### Backend
- Use proper connection pooling
- Implement proper caching
- Use proper indexing
- Implement proper monitoring

## Security Guidelines

### Frontend
- Implement proper input validation
- Use proper authentication
- Implement proper authorization
- Use proper error handling

### Backend
- Implement proper input validation
- Use proper authentication
- Implement proper authorization
- Use proper error handling

## Deployment

### Development
```bash
npm run build:dev
npm run start:dev
```

### Production
```bash
npm run build:prod
npm run start:prod
```

## Troubleshooting

### Common Issues
1. **MongoDB Connection Issues**
   - Check if MongoDB service is running
   - Verify connection string
   - Check network connectivity

2. **Kafka Connection Issues**
   - Check if Kafka service is running
   - Verify broker configuration
   - Check network connectivity

3. **Build Issues**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

## Contributing Guidelines

### Code Review Process
1. Create a feature branch
2. Write tests
3. Implement feature
4. Submit PR
5. Address review comments
6. Merge after approval

### Commit Guidelines
- Use conventional commits
- Write clear commit messages
- Reference issues in commits
- Keep commits focused

## Resources

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Kafka Documentation](https://kafka.apache.org/documentation)

### Tools
- [VS Code](https://code.visualstudio.com)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Kafka Tool](https://www.kafkatool.com)

### Communities
- [Electron Discord](https://discord.gg/electron)
- [React Discord](https://discord.gg/react)
- [TypeScript Discord](https://discord.gg/typescript)
- [MongoDB Community](https://community.mongodb.com)
- [Kafka Community](https://kafka.apache.org/community) 