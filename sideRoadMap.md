# API Workspace Sidebar Roadmap

## Current Features (Implemented)

### API & Network
- **API Tester**
  - Build and send HTTP requests, analyze responses, and map fields to MongoDB.
- **Kafka Tools**
  - Produce and consume messages from Kafka topics.

### Data & Format
- **Base64 Tools**
  - Encode/decode Base64 strings.
- **BSON Tools**
  - Encode/decode BSON data.
- **Regex Tester**
  - Build and test regular expressions.
- **Time Units**
  - Convert between time units and formats.

### Security & Auth
- **RSA Tools**
  - Encrypt/decrypt and generate RSA keys.
- **Keytab Tools**
  - Encode/decode Kerberos keytab files.
- **Helm Secrets**
  - Encrypt/decrypt Helm secrets using GPG (in progress).

---

## Proposed Features (Future)

### Security & Auth
- **JWT Decoder/Encoder**
  - Decode, inspect, and sign JWTs for API debugging.
- **OAuth2 Playground**
  - Simulate OAuth2 flows, obtain and refresh tokens.

### Data & Format
- **Hex/Binary Converter**
  - Encode/decode and visualize data in hex and binary formats.
- **JSON/YAML/XML Formatter & Validator**
  - Paste, format, and validate structured data.
- **Protobuf/Avro/Thrift Decoder**
  - Work with binary API payloads.

### API & Network
- **WebSocket Tester**
  - Connect, send, and receive messages for real-time APIs.
- **gRPC Client**
  - Test gRPC endpoints with proto file support.
- **GraphQL Explorer**
  - Build and run GraphQL queries/mutations.

### Automation & Scripting
- **Request/Response Scripting**
  - Write JS scripts to preprocess requests or postprocess responses.
- **Collection Runner**
  - Run a sequence of API requests (like Postman collections).

### Cloud & DevOps
- **Kubernetes YAML Generator/Validator**
  - Edit and validate Kubernetes manifests.
- **AWS/GCP/Azure Signature Generator**
  - Help sign requests for cloud APIs.

### Miscellaneous
- **UUID/Random Generator**
  - Generate UUIDs, random strings, etc.
- **BSON/MsgPack Tools**
  - Work with MongoDB and other binary formats.

---

*Grouping in the sidebar UI is recommended for scalability and user experience. Consider using collapsible sections or category headers in the sidebar for easier navigation as the number of tools grows.*

*This roadmap is a living document. Features may be added, removed, or reprioritized based on user feedback and needs.* 