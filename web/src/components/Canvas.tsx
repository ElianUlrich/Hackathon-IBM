import { useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, type Node, type Edge, type NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ProjectState } from '../types';
import { CATALOG } from '../data/components';
import { Esp32Node } from '../nodes/Esp32Node';
import { ComponentNode } from '../nodes/ComponentNode';

const nodeTypes = {
  esp32: Esp32Node as any,
  component: ComponentNode as any,
};

// Approximate node heights for layout (header + rows)
const NODE_ROW_H = 20;
const NODE_HEADER_H = 30;
const NODE_V_GAP = 20;
const ESP32_X = 340;
const ESP32_Y = 20;
const COMP_LEFT_X = 20;
const COMP_RIGHT_X = 660;

function buildInitialNodes(project: ProjectState, posMap: Map<string, { x: number; y: number }>): Node[] {
  const usedPins: { gpio: number; label: string }[] = [];
  const seen = new Set<number>();
  for (const comp of project.components) {
    for (const [pinName, gpio] of Object.entries(comp.pin_mapping)) {
      if (!seen.has(gpio)) {
        seen.add(gpio);
        usedPins.push({ gpio, label: `${comp.instance_id}/${pinName}` });
      }
    }
  }
  usedPins.sort((a, b) => a.gpio - b.gpio);

  const esp32H = NODE_HEADER_H + usedPins.length * NODE_ROW_H;
  const esp32Pos = posMap.get('esp32') ?? { x: ESP32_X, y: ESP32_Y };

  const nodes: Node[] = [
    {
      id: 'esp32',
      type: 'esp32',
      position: esp32Pos,
      data: { usedPins },
    },
  ];

  // Layout: left column (even indices) and right column (odd indices)
  let leftY = ESP32_Y;
  let rightY = ESP32_Y + esp32H / 2;

  project.components.forEach((comp, idx) => {
    const def = CATALOG.find(d => d.id === comp.catalog_id);
    const pins = Object.entries(comp.pin_mapping).map(([name, gpio]) => ({ name, gpio }));
    const compH = NODE_HEADER_H + pins.length * NODE_ROW_H;

    let pos: { x: number; y: number };
    if (posMap.has(comp.instance_id)) {
      pos = posMap.get(comp.instance_id)!;
    } else if (idx % 2 === 0) {
      pos = { x: COMP_LEFT_X, y: leftY };
      leftY += compH + NODE_V_GAP;
    } else {
      pos = { x: COMP_RIGHT_X, y: rightY };
      rightY += compH + NODE_V_GAP;
    }

    nodes.push({
      id: comp.instance_id,
      type: 'component',
      position: pos,
      data: {
        label: def?.name ?? comp.catalog_id,
        iface: def?.interface ?? '',
        pins,
        instanceId: comp.instance_id,
      },
    });
  });

  return nodes;
}

function buildEdges(project: ProjectState): Edge[] {
  const edges: Edge[] = [];
  for (const comp of project.components) {
    const pins = Object.entries(comp.pin_mapping);
    for (const [name, gpio] of pins) {
      edges.push({
        id: `${comp.instance_id}-${name}-${gpio}`,
        source: comp.instance_id,
        sourceHandle: `${comp.instance_id}-${name}`,
        target: 'esp32',
        targetHandle: `gpio-${gpio}`,
        label: `GPIO${gpio}`,
        animated: false,
      });
    }
  }
  return edges;
}

interface CanvasProps {
  project: ProjectState;
}

export function Canvas({ project }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // On project change: rebuild edges always, rebuild nodes preserving existing positions
  useEffect(() => {
    setNodes(prev => {
      const posMap = new Map<string, { x: number; y: number }>(
        prev.map(n => [n.id, n.position])
      );
      return buildInitialNodes(project, posMap);
    });
    setEdges(buildEdges(project));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => onNodesChange(changes),
    [onNodesChange]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
