# 🤖 IBM Tech Agent Platform

Enterprise-grade AI agent platform built with the [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/), featuring Model Context Protocol (MCP) integration, multi-agent orchestration, context-aware conversations, and production-ready deployment configurations.

## 🚀 Features

### **Phase 1: Core Foundation**
- **OpenAI Agents SDK Integration**: Full TypeScript implementation following SDK best practices
- **Streaming Support**: Real-time responses with multiple event types
- **MCP Integration**: Model Context Protocol for dynamic tool management
- **Multiple Agent Examples**: From basic hello world to complex file analysis
- **Comprehensive Logging**: Built-in tracing and debugging support

### **Phase 2: Multi-Agent Orchestration**
- **Research Bot System**: 3-agent pipeline (Planner → Search → Writer)
- **Agent Handoffs**: Intelligent routing between specialized agents
- **Advanced MCP**: All 3 server types (Stdio, HTTP, Hosted) with tool filtering
- **Web Search Integration**: Mock web search with Zod validation
- **Interactive Systems**: CLI interfaces for real-time interaction

### **Phase 3: Real-Time Web Interface**
- **Streaming Web UI**: React + TypeScript with real-time agent communication
- **Socket.io Integration**: WebSocket support for live streaming responses
- **MCP Dashboard**: Visual server management with real-time status
- **Agent Chat Interface**: Professional chat UI with typing indicators
- **Handoff Visualization**: SVG-based agent collaboration flow charts

### **Phase 4: Enterprise Features** ✨ NEW
- **Human-in-the-Loop**: Configurable approval workflows for sensitive operations
- **Comprehensive Guardrails**: Input validation, content filtering, rate limiting, PII detection
- **Context Management**: Long-term memory, conversation history, automatic summarization
- **Security**: SQL injection prevention, command injection blocking, data sanitization

### **Phase 5: Production Deployment** 🚀 NEW
- **Docker & Kubernetes**: Complete deployment configurations with high availability
- **Monitoring Stack**: Prometheus + Grafana + Loki for metrics and logs
- **Auto-scaling**: Horizontal pod autoscaling and load balancing
- **Comprehensive Testing**: 10+ test suites covering all components

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Copy environment configuration
cp env.example .env

# Add your OpenAI API key to .env file
OPENAI_API_KEY=your_actual_api_key_here

# Install web dependencies
cd web && pnpm install && cd ..
```

## 🎯 Quick Start

### Quick Examples

```bash
# 🚀 Basic Examples (Phase 1)
pnpm start:hello-world      # Programming haiku writer
pnpm start:chat-streaming   # Interactive streaming chat
pnpm start:mcp-filesystem   # Basic filesystem MCP

# 🔬 Multi-Agent System (Phase 2)
pnpm start:research-bot     # Automated research with 3 agents
pnpm start:handoff-demo     # Specialized agent routing
pnpm start:mcp-advanced     # All MCP server types

# 🌐 Web Interface (Phase 3)
pnpm start:websocket-server # WebSocket backend API
pnpm start:web              # React frontend (separate terminal)
pnpm start:fullstack        # Both backend + frontend

# 🧠 Context Management (Phase 4)
pnpm start:context-demo     # Interactive context-aware agent
pnpm start:context-research # Research scenario with memory
pnpm start:context-code     # Code assistant with context

# 🧪 Testing
pnpm test                   # Comprehensive test suite
pnpm test:comprehensive     # Detailed test output

# 🐳 Docker & Production
docker-compose up -d        # Start with Docker Compose
docker-compose logs -f      # View Docker logs
docker-compose down         # Stop containers

# ☸️ Kubernetes Deployment
kubectl apply -f k8s/       # Deploy to Kubernetes
kubectl get pods -n ibtech-agent  # Check status
```

### Full Command Reference

```bash
# 🚀 Basic Examples
tsx src/main.ts hello                # Hello world agent
tsx src/main.ts chat                 # Interactive chat
tsx src/main.ts stream               # Advanced streaming

# 🔬 Research & Multi-Agent
tsx src/main.ts research             # Research bot demo
tsx src/main.ts research-interactive # Interactive research
tsx src/main.ts research-coordination # Agent coordination

# 🔄 Agent Handoffs
tsx src/main.ts handoff              # Handoff demo
tsx src/main.ts handoff-customer     # Customer service
tsx src/main.ts handoff-interactive  # Interactive handoffs

# 🔌 MCP Integration
tsx src/main.ts mcp                  # Basic MCP
tsx src/main.ts mcp-types            # All server types
tsx src/main.ts mcp-multi            # Multi-server

# 🧠 Context Management
tsx src/main.ts context              # Interactive context demo
tsx src/main.ts context-research     # Research with memory
tsx src/main.ts context-code         # Code assistant

# 🧪 Testing
tsx src/main.ts test                 # Comprehensive tests

# 🎯 Special
tsx src/main.ts all                  # Run all examples
```

## 🏗️ Project Structure

```
ibtech-agent/
├── src/
│   ├── main.ts              # Main entry point
│   ├── config/              # Environment & configuration
│   ├── agents/              # Agent definitions & handoffs
│   ├── context/             # Context management & memory
│   ├── examples/            # Runnable demos
│   ├── guardrails/          # Security & validation
│   ├── mcp/                 # MCP server integrations
│   ├── research/            # Multi-agent research system
│   ├── server/              # WebSocket & HTTP servers
│   ├── testing/             # Comprehensive test suites
│   ├── utils/               # Logging & utilities
│   └── workflows/           # Human approval workflows
├── web/                     # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── App.tsx          # Main app
│   └── public/              # Static assets
├── k8s/                     # Kubernetes manifests
├── monitoring/              # Prometheus, Grafana, Loki
├── nginx/                   # Nginx configurations
├── docker-compose.yml       # Docker Compose
├── Dockerfile               # Backend Docker image
├── ROADMAP.md              # Development roadmap
└── DEPLOYMENT.md           # Deployment guide
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (with defaults)
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=development
LOG_LEVEL=info
ENABLE_TRACING=true
MCP_FILESYSTEM_PATH=./sample_files
```

### TypeScript Configuration

The project uses modern TypeScript with:
- ES2022 target
- NodeNext module resolution
- Strict type checking
- Source maps and declarations

## 📚 Examples Explained

### 1. Hello World Agent (`hello-world.ts`)

Basic agent that writes programming haiku. Demonstrates:
- Agent creation and configuration
- Simple text generation
- Error handling and logging

```typescript
const agent = new Agent({
  name: 'Haiku Poet',
  instructions: 'Write beautiful haiku about programming...',
  model: env.OPENAI_MODEL,
});

const result = await run(agent, 'Write a haiku about recursion');
```

### 2. Chat Streaming (`chat-streaming.ts`)

Interactive chat with real-time streaming. Features:
- Streaming responses with `{ stream: true }`
- Real-time text output
- Interactive readline interface
- Event handling and word counting

```typescript
const result = await run(agent, userInput, { stream: true });
const textStream = result.toTextStream();

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### 3. MCP Filesystem (`mcp-filesystem.ts`)

Model Context Protocol integration. Includes:
- MCPServerStdio for filesystem access
- Tool filtering and selective exposure
- File reading and analysis
- Cross-file content correlation

```typescript
const mcpServer = new MCPServerStdio({
  name: 'Filesystem MCP Server',
  fullCommand: 'npx -y @modelcontextprotocol/server-filesystem',
  args: [path.resolve(env.MCP_FILESYSTEM_PATH)],
});

const agent = new Agent({
  name: 'File Assistant',
  mcpServers: [mcpServer],
});
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev                    # Watch mode development
pnpm build                  # TypeScript compilation
pnpm start                  # Run compiled JavaScript

# Examples
pnpm start:hello-world      # Basic hello world agent
pnpm start:chat-streaming   # Interactive streaming chat
pnpm start:mcp-filesystem   # MCP filesystem integration
```

### Logging

The platform includes comprehensive logging:

```typescript
import { logger } from './utils/logger.js';

logger.info('General information');
logger.agent('AgentName', 'Agent-specific message');
logger.tool('ToolName', 'Tool execution info');
logger.mcp('ServerName', 'MCP server status');
```

### Adding New Examples

1. Create a new file in `src/examples/`
2. Follow the existing pattern with proper error handling
3. Add the new script to `package.json`
4. Update the main runner in `src/main.ts`

## 📚 Documentation

- **[ROADMAP.md](ROADMAP.md)**: Complete 10-week development roadmap with all features
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Production deployment guide for Docker and Kubernetes
- **[OpenAI Agents SDK Docs](https://openai.github.io/openai-agents-js/)**: Official SDK documentation

## 🎯 Use Cases

### 1. Research Assistant
Multi-agent pipeline that plans, searches, and synthesizes research reports with long-term memory.

### 2. Customer Service
Intelligent triage and routing with context-aware responses and approval workflows.

### 3. Code Assistant
Programming help with project context, coding preferences, and security guardrails.

### 4. Enterprise Agent Platform
Production-ready deployment with monitoring, scaling, and security features.

## 📖 OpenAI Agents SDK Reference

This project follows OpenAI Agents SDK best practices:

- **TypeScript-first design**: Full type safety and IntelliSense
- **Zod validation**: Schema validation for tools and inputs
- **Streaming support**: Real-time response handling
- **MCP integration**: Extensible tool ecosystem
- **Built-in tracing**: Workflow visualization and debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript and logging conventions
4. Add examples and documentation
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

---

Built with ❤️ using OpenAI Agents SDK and TypeScript