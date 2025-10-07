import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Zap,
  MessageCircle
} from 'lucide-react';
import { HandoffEvent, AgentExecution, AgentType } from '../../types/agent';
import { clsx } from 'clsx';

interface HandoffFlowProps {
  handoffs: HandoffEvent[];
  executions: AgentExecution[];
  isRealTime?: boolean;
}

interface FlowNode {
  id: string;
  agentName: string;
  agentType: AgentType;
  status: 'idle' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  input?: string;
  output?: string;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  fromNode: string;
  toNode: string;
  handoff: HandoffEvent;
  isActive: boolean;
}

const getAgentColor = (agentType: AgentType) => {
  switch (agentType) {
    case 'planner':
      return 'purple';
    case 'search':
      return 'cyan';
    case 'writer':
      return 'green';
    case 'triage':
      return 'blue';
    case 'customer-service':
      return 'indigo';
    case 'billing':
      return 'yellow';
    case 'technical-support':
      return 'red';
    default:
      return 'gray';
  }
};

const getStatusIcon = (status: FlowNode['status']) => {
  switch (status) {
    case 'active':
      return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bot className="w-4 h-4 text-gray-400" />;
  }
};

export const HandoffFlow: React.FC<HandoffFlowProps> = ({
  handoffs,
  executions,
  isRealTime = false
}) => {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [animatingEdge, setAnimatingEdge] = useState<string | null>(null);

  // Build flow visualization from handoffs and executions
  useEffect(() => {
    const agentNodes = new Map<string, FlowNode>();
    const agentEdges: FlowEdge[] = [];

    // Create nodes from executions
    executions.forEach((execution, index) => {
      if (!agentNodes.has(execution.agentName)) {
        agentNodes.set(execution.agentName, {
          id: execution.agentName,
          agentName: execution.agentName,
          agentType: execution.agentType,
          status: execution.status === 'running' ? 'active' :
                 execution.status === 'completed' ? 'completed' :
                 execution.status === 'failed' ? 'failed' : 'idle',
          startTime: execution.startTime,
          endTime: execution.endTime,
          input: execution.input,
          output: execution.output,
          position: {
            x: (index % 3) * 300 + 150,
            y: Math.floor(index / 3) * 200 + 100
          }
        });
      }
    });

    // Create edges from handoffs
    handoffs.forEach((handoff, index) => {
      agentEdges.push({
        id: `${handoff.fromAgent}-${handoff.toAgent}-${index}`,
        fromNode: handoff.fromAgent,
        toNode: handoff.toAgent,
        handoff,
        isActive: false
      });
    });

    setNodes(Array.from(agentNodes.values()));
    setEdges(agentEdges);
  }, [handoffs, executions]);

  // Animate handoffs in real-time
  useEffect(() => {
    if (!isRealTime || handoffs.length === 0) return;

    const latestHandoff = handoffs[handoffs.length - 1];
    const edgeId = `${latestHandoff.fromAgent}-${latestHandoff.toAgent}`;

    setAnimatingEdge(edgeId);

    const timer = setTimeout(() => {
      setAnimatingEdge(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [handoffs, isRealTime]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            No Agent Handoffs
          </h3>
          <p className="text-gray-500 text-sm">
            Agent handoff visualization will appear here once agents start collaborating.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Agent Handoff Flow
          </h3>
          <p className="text-sm text-gray-600">
            Visualizing agent collaboration and task delegation
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Failed</span>
          </div>
        </div>
      </div>

      {/* Flow Visualization */}
      <div className="relative bg-gray-50 rounded-lg p-8 min-h-96 overflow-auto">
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        >
          {/* Render edges */}
          {edges.map((edge) => {
            const fromNode = nodes.find(n => n.id === edge.fromNode);
            const toNode = nodes.find(n => n.id === edge.toNode);

            if (!fromNode || !toNode) return null;

            const x1 = fromNode.position.x + 75; // Center of node
            const y1 = fromNode.position.y + 40;
            const x2 = toNode.position.x + 75;
            const y2 = toNode.position.y + 40;

            const isAnimating = animatingEdge === `${edge.fromNode}-${edge.toNode}`;

            return (
              <g key={edge.id}>
                {/* Edge line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isAnimating ? '#3b82f6' : '#d1d5db'}
                  strokeWidth={isAnimating ? 3 : 2}
                  strokeDasharray={isAnimating ? '5,5' : 'none'}
                  className={isAnimating ? 'animate-pulse' : ''}
                />

                {/* Arrow marker */}
                <polygon
                  points={`${x2-8},${y2-4} ${x2},${y2} ${x2-8},${y2+4}`}
                  fill={isAnimating ? '#3b82f6' : '#6b7280'}
                />

                {/* Handoff timestamp */}
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="10"
                >
                  {edge.handoff.timestamp.toLocaleTimeString()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Render nodes */}
        {nodes.map((node) => {
          const color = getAgentColor(node.agentType);
          const isSelected = selectedNode === node.id;

          return (
            <div
              key={node.id}
              className={clsx(
                'absolute w-32 h-20 rounded-lg border-2 cursor-pointer transition-all duration-200',
                'flex flex-col items-center justify-center p-2',
                isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : '',
                node.status === 'active' && 'animate-pulse-slow',
                `bg-${color}-50 border-${color}-200 hover:border-${color}-300`
              )}
              style={{
                left: node.position.x,
                top: node.position.y,
                zIndex: 2
              }}
              onClick={() => handleNodeClick(node.id)}
            >
              <div className="flex items-center gap-1 mb-1">
                {getStatusIcon(node.status)}
                <span className="text-xs font-medium text-gray-700 truncate">
                  {node.agentName}
                </span>
              </div>

              <div className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                `bg-${color}-100 text-${color}-700`
              )}>
                {node.agentType}
              </div>

              {node.startTime && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{node.startTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Node Details Panel */}
      {selectedNode && (() => {
        const node = nodes.find(n => n.id === selectedNode);
        if (!node) return null;

        return (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {node.agentName} Details
              </h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Agent Type:</span>
                <p className="text-gray-600">{node.agentType}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <p className={clsx(
                  'font-medium',
                  node.status === 'active' && 'text-yellow-600',
                  node.status === 'completed' && 'text-green-600',
                  node.status === 'failed' && 'text-red-600',
                  node.status === 'idle' && 'text-gray-600'
                )}>
                  {node.status}
                </p>
              </div>

              {node.startTime && (
                <div>
                  <span className="font-medium text-gray-700">Started:</span>
                  <p className="text-gray-600">
                    {node.startTime.toLocaleString()}
                  </p>
                </div>
              )}

              {node.endTime && (
                <div>
                  <span className="font-medium text-gray-700">Completed:</span>
                  <p className="text-gray-600">
                    {node.endTime.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {node.input && (
              <div className="mt-3">
                <span className="font-medium text-gray-700">Input:</span>
                <p className="text-gray-600 text-sm mt-1 p-2 bg-white rounded border">
                  {node.input}
                </p>
              </div>
            )}

            {node.output && (
              <div className="mt-3">
                <span className="font-medium text-gray-700">Output:</span>
                <p className="text-gray-600 text-sm mt-1 p-2 bg-white rounded border max-h-32 overflow-y-auto">
                  {node.output}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Handoff History */}
      {handoffs.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">
            Handoff History ({handoffs.length})
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {handoffs.slice().reverse().map((handoff, index) => (
              <div
                key={handoff.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm"
              >
                <MessageCircle className="w-4 h-4 text-blue-500" />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {handoff.fromAgent}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {handoff.toAgent}
                    </span>
                  </div>

                  <p className="text-gray-600 mt-1">
                    {handoff.reason}
                  </p>
                </div>

                <div className="text-xs text-gray-500">
                  {handoff.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};