import React, { useMemo } from "react";
import { useTransition, a } from "@react-spring/three";
import JoinNodesDot from "./joinNodesDot";
import AnimatedDashedSegment from "./animatedDashedSegment";

const Connections = ({ nodes, nodePositions, nodeSize, onJoinNodesDoubleClick }) => {
  const auraFactor = 1.2;
  const threshold = 2 * nodeSize * auraFactor;
  const thresholdSquared = threshold * threshold;

  // Compute connection graph only when necessary
  const connectionsData = useMemo(() => {
    const graph = {};
    nodes.forEach((node) => {
      graph[node.nodeId] = [];
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const pos1 = nodePositions[n1.nodeId];
        const pos2 = nodePositions[n2.nodeId];
        if (!pos1 || !pos2) continue;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        if (dx * dx + dy * dy < thresholdSquared) {
          graph[n1.nodeId].push(n2.nodeId);
          graph[n2.nodeId].push(n1.nodeId);
        }
      }
    }
    const visited = new Set();
    const components = [];
    const dfs = (nodeId, comp) => {
      visited.add(nodeId);
      comp.push(nodeId);
      graph[nodeId].forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, comp);
        }
      });
    };
    nodes.forEach((node) => {
      if (!visited.has(node.nodeId)) {
        const comp = [];
        dfs(node.nodeId, comp);
        if (comp.length > 1) components.push(comp);
      }
    });
    return components;
  }, [nodes, nodePositions, thresholdSquared]);

  const transitions = useTransition(connectionsData, {
    keys: (item) => item.slice().sort().join("-"),
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { duration: 80 },
  });

  return transitions((props, componentNodes, t, index) => {
    const points = componentNodes
      .map((id) => nodePositions[id])
      .filter(Boolean);
    if (points.length < 2) return null;

    let center = { x: 0, y: 0 };
    if (points.length === 2) {
      center = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      };
    } else {
      const centroid = points.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
      );
      centroid.x /= points.length;
      centroid.y /= points.length;
      center = centroid;
    }

    return (
      <a.group key={index}>
        {componentNodes.map((id) => {
          const pos = nodePositions[id];
          if (!pos) return null;
          return (
            <AnimatedDashedSegment
              key={id}
              start={pos}
              end={center}
              opacity={props.opacity}
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
