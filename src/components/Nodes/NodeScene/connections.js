import React, { useMemo, useCallback, useRef } from "react";
import { useTransition, a } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import JoinNodesDot from "./joinNodesDot";
import AnimatedDashedSegment from "./animatedDashedSegment";

const Connections = ({ nodes, nodePositions, nodeSize, onJoinNodesDoubleClick }) => {
  const auraFactor = 1.2;
  const threshold = 2 * nodeSize * auraFactor;
  const thresholdSquared = threshold * threshold;

  const lines = useRef(new Set());

  const registerLine = useCallback((line, remove = false) => {
    if (!line) return;
    if (remove) lines.current.delete(line);
    else lines.current.add(line);
  }, []);

  useFrame((_, delta) => {
    for (const line of lines.current) {
      const mat = line?.material;
      if (mat && typeof mat.dashOffset === "number") {
        mat.dashOffset -= delta * 0.5;
      }
    }
  });

  const connectionsData = useMemo(() => {
    const graph = {};
    for (const n of nodes) graph[n.nodeId] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1 = nodePositions[n1.nodeId];
        const p2 = nodePositions[n2.nodeId];
        if (!p1 || !p2) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;

        if (dx * dx + dy * dy < thresholdSquared) {
          graph[n1.nodeId].push(n2.nodeId);
          graph[n2.nodeId].push(n1.nodeId);
        }
      }
    }

    const visited = new Set();
    const components = [];

    const dfs = (id, comp) => {
      visited.add(id);
      comp.push(id);
      for (const nb of graph[id]) if (!visited.has(nb)) dfs(nb, comp);
    };

    for (const n of nodes) {
      if (!visited.has(n.nodeId)) {
        const comp = [];
        dfs(n.nodeId, comp);
        if (comp.length > 1) {
          const key = comp.slice().sort().join("-");
          components.push({ key, nodes: comp });
        }
      }
    }

    return components;
  }, [nodes, nodePositions, thresholdSquared]);

  const transitions = useTransition(connectionsData, {
    keys: (item) => item.key,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { duration: 80 },
  });

  return transitions((props, item) => {
    const componentNodes = item.nodes;

    const pts = componentNodes.map((id) => nodePositions[id]).filter(Boolean);
    if (pts.length < 2) return null;

    let center;
    if (pts.length === 2) {
      center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    } else {
      const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      center = { x: sum.x / pts.length, y: sum.y / pts.length };
    }

    return (
      <a.group key={item.key}>
        {componentNodes.map((id) => {
          const pos = nodePositions[id];
          if (!pos) return null;
          return (
            <AnimatedDashedSegment
              key={id}
              start={pos}
              end={center}
              opacity={props.opacity}
              registerLine={registerLine}
            />
          );
        })}

        <JoinNodesDot
          position={center}
          nodesInGroup={componentNodes}
          globalOpacity={props.opacity}
          onJoinNodesDoubleClick={onJoinNodesDoubleClick}
        />
      </a.group>
    );
  });
};

export default React.memo(Connections);
