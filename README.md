# IBM Tech Agent Platform

An intelligent agent platform built with OpenAI Agents SDK, featuring Model Context Protocol (MCP) integration and real-time streaming capabilities.

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

# 🐳 Docker & Production
pnpm start:docker           # Start with Docker Compose
pnpm build:docker           # Build Docker images
pnpm logs:docker           # View Docker logs
pnpm stop:docker           # Stop Docker containers

# 🔧 Development & Testing
pnpm start:health           # Health check server
pnpm test                  # Run test suite
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

# 🎯 Special
tsx src/main.ts all                  # Run all examples
```

## 🏗️ Project Structure

```
src/
├── main.ts                 # Main application entry point
├── config/
│   └── env.ts             # Environment configuration with Zod validation
├── utils/
│   └── logger.ts          # Comprehensive logging utility
├── examples/
│   ├── hello-world.ts     # Basic agent implementation
│   ├── chat-streaming.ts  # Streaming and interactive chat
│   └── mcp-filesystem.ts  # MCP integration examples
├── agents/                # Future: Custom agent implementations
├── tools/                 # Future: Custom tool definitions
└── mcp/                   # Future: MCP server configurations

sample_files/              # Sample data for MCP filesystem server
├── books.txt             # Programming book recommendations
├── favorite_songs.txt    # Coding music playlist
└── project_ideas.txt     # Development project ideas
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

## 🔮 Roadmap

This is Phase 1 of a comprehensive agent platform. Upcoming features:

- **Phase 2**: Multi-agent orchestration with handoffs
- **Phase 3**: Web interface with real-time streaming
- **Phase 4**: Advanced MCP server types (HTTP, Hosted)
- **Phase 5**: Production deployment and enterprise features

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