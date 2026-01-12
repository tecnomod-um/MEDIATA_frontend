import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import Node from "../Node/node";
import Connections from "./connections";

const DraggableNodes = ({ nodes, onNodeClick, onJoinNodesDoubleClick }) => {
  const { camera, gl, viewport } = useThree();
  const controls = useRef(null);
  const groupRef = useRef();
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [globalIsDragging, setGlobalIsDragging] = useState(false);
  const nodePositionsRef = useRef({});
  const [nodePositions, setNodePositions] = useState({});
  const targetPositionsRef = useRef({});

  const nodeSize = Math.max(
    viewport.width / Math.max(12, nodes.length + 5),
    1.5
  );
  const descriptionWidth = Math.max(
    (viewport.width * 0.2) / Math.max(4, nodes.length - 1),
    3.5
  );
  const fontSize = Math.max(
    (0.3 * viewport.width) / Math.max(12, nodes.length + 5),
    0.1
  );

  const minNodeSize = 1.0;
  const minDescriptionWidth = 2.0;
  const minFontSize = 0.35;

  const adjustedNodeSize = Math.max(nodeSize, minNodeSize);
  const adjustedDescriptionWidth = Math.max(
    descriptionWidth,
    minDescriptionWidth
  );
  const adjustedFontSize = Math.max(fontSize, minFontSize);
  const descriptionSize = useMemo(() => [adjustedDescriptionWidth, 0.5], [adjustedDescriptionWidth]);

  useEffect(() => {
    if (nodes.length === 0) return;
    const newPositions = {};
    const angleStep = (2 * Math.PI) / nodes.length;
    const radius = Math.min(viewport.width, viewport.height) / 3;

    nodes.forEach((node, index) => {
      const angle = index * angleStep;
      newPositions[node.nodeId] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    setNodePositions(newPositions);
    nodePositionsRef.current = newPositions;
    targetPositionsRef.current = { ...newPositions };
  }, [nodes, viewport]);

  const detectCollision = (node1, node2) => {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < nodeSize;
  };

  const memoizedNodes = useMemo(() =>
    nodes.map(node => ({
      ...node,
      position: nodePositions[node.nodeId] || node.position,
      _meta: Object.freeze({
        adjustedNodeSize,
        descriptionSize,
        adjustedFontSize,
        viewport
      })
    })),
    [nodes, nodePositions, adjustedNodeSize, descriptionSize, adjustedFontSize, viewport]
  );

  const handleCollisions = () => {
    const updatedPositions = { ...targetPositionsRef.current };

    for (let nodeId1 in updatedPositions) {
      if (nodeId1 === draggedNodeId) continue;

      for (let nodeId2 in updatedPositions) {
        if (nodeId1 === nodeId2) continue;

        const node1 = updatedPositions[nodeId1];
        const node2 = updatedPositions[nodeId2];

        if (detectCollision(node1, node2)) {
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          const angle = Math.atan2(dy, dx);

          if (nodeId2 !== draggedNodeId) {
            updatedPositions[nodeId2] = constrainPosition({
              x: node2.x + Math.cos(angle) * nodeSize,
              y: node2.y + Math.sin(angle) * nodeSize,
            });
          }

          if (nodeId1 !== draggedNodeId) {
            updatedPositions[nodeId1] = constrainPosition({
              x: node1.x - Math.cos(angle) * nodeSize,
              y: node1.y - Math.sin(angle) * nodeSize,
            });
          }
        }
      }
    }

    targetPositionsRef.current = updatedPositions;
  };

  const constrainPosition = useCallback(
    (position) => {
      const { width, height } = viewport;
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      return {
        x: Math.min(
          Math.max(position.x, -halfWidth + nodeSize / 2),
          halfWidth - nodeSize / 2
        ),
        y: Math.min(
          Math.max(position.y, -halfHeight + nodeSize / 2),
          halfHeight - nodeSize / 2
        ),
      };
    },
    [viewport, nodeSize]
  );

  useFrame(() => {
    const newPositions = { ...nodePositionsRef.current };

    for (const nodeId in newPositions) {
      const target = targetPositionsRef.current[nodeId];
      if (target) {
        newPositions[nodeId] = {
          x: newPositions[nodeId].x + (target.x - newPositions[nodeId].x) * 0.1,
          y: newPositions[nodeId].y + (target.y - newPositions[nodeId].y) * 0.1,
        };
      }
    }

    setNodePositions(newPositions);
    nodePositionsRef.current = newPositions;
    handleCollisions();
  });

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!draggedNodeId) return;

      const isTouch = event.type === "touchmove";
      const clientX = isTouch ? event.touches[0].clientX : event.clientX;
      const clientY = isTouch ? event.touches[0].clientY : event.clientY;

      const rect = gl.domElement.getBoundingClientRect();
      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

      const vector = {
        x: mouseX * (viewport.width / 2),
        y: mouseY * (viewport.height / 2),
      };

      const constrainedPosition = constrainPosition(vector);

      const newPositions = {
        ...nodePositionsRef.current,
        [draggedNodeId]: constrainedPosition,
      };

      setNodePositions(newPositions);
      nodePositionsRef.current = newPositions;
      targetPositionsRef.current[draggedNodeId] = newPositions[draggedNodeId];
    };

    const handlePointerUp = () => {
      if (draggedNodeId) {
        setDraggedNodeId(null);
        setGlobalIsDragging(false);
      }
    };

    if (globalIsDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove);
      window.addEventListener("touchend", handlePointerUp);
    }

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [globalIsDragging, draggedNodeId, constrainPosition, viewport, gl.domElement]);

  useEffect(() => {
    if (groupRef.current) {
      const draggableObjects = [];
      groupRef.current.traverse((obj) => {
        if (obj.userData?.nodeId) draggableObjects.push(obj);
      });
      const byId = new Map();
      for (const obj of draggableObjects) {
        if (!byId.has(obj.userData.nodeId)) byId.set(obj.userData.nodeId, obj);
      }
      const rootsOnly = Array.from(byId.values());
      
      controls.current = new DragControls(rootsOnly, camera, gl.domElement);
      controls.current.recursive = false;
      controls.current.addEventListener("dragstart", (event) => {
        const nodeId = event.object.userData.nodeId;
        setDraggedNodeId(nodeId);
        setGlobalIsDragging(true);
      });

      controls.current.addEventListener("dragend", () => {
        if (draggedNodeId) {
          const constrainedPosition = constrainPosition({
            x: nodePositionsRef.current[draggedNodeId].x,
            y: nodePositionsRef.current[draggedNodeId].y,
          });

          const newPositions = {
            ...nodePositionsRef.current,
            [draggedNodeId]: constrainedPosition,
          };

          setNodePositions(newPositions);
          nodePositionsRef.current = newPositions;
          targetPositionsRef.current[draggedNodeId] =
            newPositions[draggedNodeId];

          setDraggedNodeId(null);
          setGlobalIsDragging(false);
        }
      });

      controls.current.addEventListener("hoveron", () => {
        gl.domElement.style.cursor = "pointer";
      });

      controls.current.addEventListener("hoveroff", () => {
        gl.domElement.style.cursor = "auto";
      });
    }

    return () => { if (controls.current) controls.current.dispose() };
  }, [camera, gl, nodes, constrainPosition, draggedNodeId]);

  return (
    <>
      <group ref={groupRef}>
        {memoizedNodes.map((node) => (
          <Node
            key={node.nodeId}
            node={node}
            onNodeClick={onNodeClick}
            isDragging={draggedNodeId === node.nodeId}
            globalIsDragging={globalIsDragging}
            nodeSize={node._meta.adjustedNodeSize}
            descriptionSize={node._meta.descriptionSize}
            fontSize={node._meta.adjustedFontSize}
            viewport={node._meta.viewport}
          />
        ))}
      </group>
      <Connections
        nodes={nodes}
        nodePositions={nodePositions}
        nodeSize={adjustedNodeSize}
        onJoinNodesDoubleClick={onJoinNodesDoubleClick}
      />
    </>
  );
}

export default DraggableNodes;
