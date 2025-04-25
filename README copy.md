# API and Kafka Testing Tool

A powerful desktop application built with Electron for testing and monitoring APIs and Kafka messaging systems. This tool provides a user-friendly interface for developers and testers to validate their services and message queues efficiently.

## Features

- **API Testing with MongoDB Integration**
  - REST API testing with dynamic request building
  - MongoDB field mapping and data integration
  - Real-time request execution and monitoring
  - Comprehensive results dashboard

- **Kafka Message Testing**
  - Message production and consumption testing
  - Topic and consumer group management
  - Real-time message flow monitoring
  - Consumer lag tracking

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Core Components

### 1. API Tester
The API Tester is a sophisticated tool that allows users to test REST APIs with MongoDB integration. It provides a step-by-step interface for configuring and executing API tests.

#### Features:
1. **Connection Configuration**
   - MongoDB connection setup with default localhost connection
   - Database and collection selection
   - Real-time connection validation

2. **CURL Command Builder**
   - Dynamic base URL configuration
   - Support for path parameters using `{paramName}` syntax
   - Query parameter handling
   - Header management
   - Request body configuration

3. **Request Builder**
   - Visual interface for linking MongoDB fields to request components
   - Support for:
     - Path parameters
     - Query parameters
     - Headers
     - Request body
   - Real-time validation of field mappings

4. **Execution Configuration**
   - Configurable number of requests
   - Synchronous/Asynchronous execution options
   - Real-time progress monitoring

5. **Results Dashboard**
   - Request success rate statistics
   - Average response time
   - Detailed request logs
   - Error reporting
   - Visual status indicators

### 2. Kafka Tester
The Kafka Tester provides tools for testing and monitoring Kafka message queues.

#### Features:
1. **Connection Management**
   - Kafka broker configuration
   - Topic management
   - Consumer group setup

2. **Message Testing**
   - Message production testing
   - Message consumption monitoring
   - Message format validation
   - Schema validation

3. **Monitoring**
   - Real-time message flow visualization
   - Topic statistics
   - Consumer lag monitoring
   - Error tracking

## Technical Details

### API Tester Implementation
1. **State Management**
   ```typescript
   interface ConnectionConfig {
     connectionString: string;
     database?: string;
   }

   interface ExecutionConfig {
     count: number;
     isAsync: boolean;
   }

   interface RequestResult {
     status: number;
     time: number;
     success: boolean;
     error?: string;
   }
   ```

2. **Key Workflows**
   - MongoDB connection and collection selection
   - CURL command parsing and validation
   - Request building with MongoDB field mapping
   - Request execution and result collection
   - Results visualization and analysis

### Kafka Tester Implementation
1. **State Management**
   ```typescript
   interface KafkaConfig {
     brokers: string[];
     topic: string;
     consumerGroup: string;
   }

   interface MessageConfig {
     key: string;
     value: string;
     headers?: Record<string, string>;
   }
   ```

2. **Key Workflows**
   - Kafka connection management
   - Topic and consumer group configuration
   - Message production and consumption
   - Real-time monitoring and statistics

## Usage Guidelines

### API Tester
1. **Setting Up a Test**
   - Configure MongoDB connection
   - Select database and collection
   - Enter base URL for API
   - Input CURL command with path parameters
   - Map MongoDB fields to request components
   - Configure execution parameters
   - Run tests and analyze results

2. **Best Practices**
   - Use `{paramName}` syntax for path parameters
   - Validate MongoDB field mappings before execution
   - Monitor response times and success rates
   - Review error logs for failed requests

### Kafka Tester
1. **Setting Up a Test**
   - Configure Kafka broker connection
   - Select or create topics
   - Set up consumer groups
   - Configure message format
   - Start monitoring

2. **Best Practices**
   - Validate message schemas
   - Monitor consumer lag
   - Track message flow patterns
   - Review error logs

## Error Handling
- Connection errors are displayed with detailed messages
- Request failures are logged with status codes and error messages
- Kafka connection issues are reported with broker-specific details
- Message validation errors are tracked and displayed

## Security Considerations
- MongoDB connection strings are handled securely
- Kafka credentials are managed securely
- API endpoints are validated before execution
- Sensitive data in logs is properly masked

## Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Kafka (for Kafka testing features)

### Building from Source
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the application: `npm run build`
4. Start the application: `npm start`

### Development Scripts
- `npm start` - Start the application in development mode
- `npm run build` - Build the application for production
- `npm test` - Run tests
- `npm run lint` - Run linting

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support
For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments
- Electron team for the amazing framework
- MongoDB team for their excellent database
- Apache Kafka team for their powerful messaging system
