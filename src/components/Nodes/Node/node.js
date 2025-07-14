import React, { useRef, useEffect, useState, useCallback } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { DoubleSide, TextureLoader, Color, Shape } from "three";
import { useSpring, a } from "@react-spring/three";
import nodeIcon from "../../../resources/images/node_image.png";

const Node = ({ node, onNodeClick, isDragging, globalIsDragging, nodeSize, descriptionSize, fontSize }) => {
  const ref = useRef();
  const auraRef = useRef();
  const rippleRef = useRef();
  const descriptionRef = useRef();
  const descriptionBackgroundRef = useRef();
  const texture = useLoader(TextureLoader, nodeIcon);

  const [hovered, setHovered] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(descriptionSize[1]);
  const [rippleActive, setRippleActive] = useState(false);
  const [clickDelayActive, setClickDelayActive] = useState(false);
  const mainNameRef = useRef();
  const [nameWidth, setNameWidth] = useState(0);
  const [nameHeight, setNameHeight] = useState(0);

  const { opacity: hoverOpacity } = useSpring({
    opacity:
      hovered && !isDragging && !globalIsDragging && !clickDelayActive ? 1 : 0,
    config: { duration: 200 },
  });

  const { scale } = useSpring({
    scale:
      hovered && !isDragging && !globalIsDragging && !clickDelayActive
        ? [1, 1, 1]
        : [0, 1, 1],
    config: { duration: 200 },
  });

  const { rippleScale, rippleOpacity } = useSpring({
    rippleScale: rippleActive ? nodeSize * 0.8 : 0,
    rippleOpacity: rippleActive ? 0 : 1,
    config: { duration: 400 },
    onRest: () => setRippleActive(false),
  });

  const fadeInProps = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 250 },
  });
  const interpolatedOpacity= fadeInProps.opacity.to((o) => o);

  const updatePosition = useCallback(
    (clock) => {
      if (ref.current) {
        const elapsedTime = clock.getElapsedTime();
        const targetY = node.position.y + Math.sin(elapsedTime) * 0.1;
        if (!isDragging)
          ref.current.position.y =
            ref.current.position.y + (targetY - ref.current.position.y) * 0.1;
        else ref.current.position.y = node.position.y;
      }
    }, [isDragging, node.position.y]
  );

  const updateAuraScale = useCallback((clock) => {
    if (auraRef.current) {
      const s = 1 + 0.05 * Math.sin(clock.getElapsedTime() * 1.5);
      auraRef.current.scale.set(s, s, s);
    }
  }, []);

  useFrame(({ clock }) => {
    updatePosition(clock);
    updateAuraScale(clock);
  });

  useEffect(() => {
    if (ref.current) ref.current.userData.nodeId = node.nodeId;
  }, [node.nodeId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (descriptionRef.current) {
        const bbox = descriptionRef.current.geometry?.boundingBox;
        if (bbox) {
          const textHeight = bbox.max.y - bbox.min.y;
          setDescriptionHeight(textHeight + 0.2);
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [node.description, hovered]);
  useEffect(() => {
    const disableRaycast = (refObj) => {
      if (refObj.current) {
        refObj.current.traverse((child) => {
          child.raycast = () => null;
        });
      }
    };
    disableRaycast(auraRef);
    disableRaycast(descriptionRef);
    disableRaycast(descriptionBackgroundRef);
  }, []);

  const handleDoubleClick = () => {
    setRippleActive(true);
    onNodeClick(node.nodeId);
  };

  const handleSingleClick = () => {
    if (navigator.maxTouchPoints > 0) {
      setRippleActive(true);
    } else {
      setClickDelayActive(true);
      setTimeout(() => setClickDelayActive(false), 1200);
    }
  };

  const descriptionVisibility = useSpring({
    opacity: !clickDelayActive ? 1 : 0,
    config: { duration: 200 },
  });

  const handleNameSync = (mesh) => {
    if (mesh && mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const bbox = mesh.geometry.boundingBox;
      if (bbox) {
        const measuredWidth = bbox.max.x - bbox.min.x;
        const measuredHeight = bbox.max.y - bbox.min.y;
        if (
          isFinite(measuredWidth) &&
          isFinite(measuredHeight) &&
          measuredWidth > 0 &&
          measuredHeight > 0
        ) {
          setNameWidth(measuredWidth);
          setNameHeight(measuredHeight);
        }
      }
    }
  };

  const backgroundColor = new Color(node.color).multiplyScalar(0.8).getStyle();
  const margin = 0.1;

  return (
    <a.mesh
      ref={ref}
      position={[node.position.x, node.position.y, 0]}
      onDoubleClick={handleDoubleClick}
      onClick={handleSingleClick}
      onPointerOver={() => !clickDelayActive && setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      {...fadeInProps}
    >
      <a.mesh
        ref={auraRef}
        position={[0, 0, -0.05]}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <circleGeometry args={[nodeSize * 1.25, 32]} />
        <a.meshBasicMaterial
          color={node.color}
          transparent
          opacity={interpolatedOpacity.to((o) => 0.3 * o)}
          side={DoubleSide}
        />
      </a.mesh>

      {rippleActive && (
        <a.mesh
          ref={rippleRef}
          position={[0, 0, -0.04]}
          scale={rippleScale.to((s) => [s, s, s])}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <circleGeometry args={[nodeSize * 0.625, 32]} />
          <a.meshBasicMaterial
            color={node.color}
            transparent
            opacity={rippleOpacity.to((ro) => ro * interpolatedOpacity)}
            side={DoubleSide}
          />
        </a.mesh>
      )}

      <planeGeometry args={[nodeSize, nodeSize]} />
      <a.meshStandardMaterial
        map={texture}
        side={DoubleSide}
        transparent
        alphaTest={0.5}
        opacity={interpolatedOpacity}
      />

      <a.mesh
        ref={descriptionBackgroundRef}
        position={[0, nodeSize * 1.1, 0.04]}
        scale={scale}
        {...descriptionVisibility}
        {...fadeInProps}
      >
        {(() => {
          const width = descriptionSize[0];
          const height = descriptionHeight;
          if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0)
            return null;
          const borderRadius = Math.min(width, height) * 0.2;
          const shape = new Shape();
          const x = -width / 2;
          const y = -height / 2;
          shape.moveTo(x + borderRadius, y);
          shape.lineTo(x + width - borderRadius, y);
          shape.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
          shape.lineTo(x + width, y + height - borderRadius);
          shape.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
          shape.lineTo(x + borderRadius, y + height);
          shape.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
          shape.lineTo(x, y + borderRadius);
          shape.quadraticCurveTo(x, y, x + borderRadius, y);
          return <shapeGeometry args={[shape]} />;
        })()}
        <a.meshBasicMaterial color="#1a1a1a" transparent opacity={hoverOpacity} />
      </a.mesh>

      <a.group
        position={[0, nodeSize * 1.1, 0.05]}
        scale={scale}
        {...descriptionVisibility}
      >
        <Text
          ref={descriptionRef}
          fontSize={fontSize * 0.5}
          color="white"
          toneMapped={false}
          anchorX="center"
          anchorY="middle"
          maxWidth={descriptionSize[0] * 0.9}
          lineHeight={1.2}
          visible={!clickDelayActive}
          opacity={interpolatedOpacity}
        >
          {node.description}
        </Text>
      </a.group>

      <group position={[0, -nodeSize * 0.7, 0.02]}>
        {nameWidth > 0 && nameHeight > 0 && (
          <mesh position={[0, 0, 0]}>
            {(() => {
              const w = nameWidth + margin;
              const h = nameHeight + margin;
              if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
              const borderRadius = Math.min(w, h) * 0.2;
              const shape = new Shape();
              const x = -w / 2;
              const y = -h / 2;
              shape.moveTo(x + borderRadius, y);
              shape.lineTo(x + w - borderRadius, y);
              shape.quadraticCurveTo(x + w, y, x + w, y + borderRadius);
              shape.lineTo(x + w, y + h - borderRadius);
              shape.quadraticCurveTo(x + w, y + h, x + w - borderRadius, y + h);
              shape.lineTo(x + borderRadius, y + h);
              shape.quadraticCurveTo(x, y + h, x, y + h - borderRadius);
              shape.lineTo(x, y + borderRadius);
              shape.quadraticCurveTo(x, y, x + borderRadius, y);
              return <shapeGeometry args={[shape]} />;
            })()}
            <meshBasicMaterial
              color={backgroundColor}
              transparent
              opacity={0.9}
              side={DoubleSide}
            />
          </mesh>
        )}
        <Text
          ref={mainNameRef}
          onSync={handleNameSync}
          position={[0, 0, 0.01]}
          fontSize={fontSize * 0.9}
          color="rgba(255,255,255)"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          lineHeight={1}
          letterSpacing={-0.015}
          materialType="MeshStandardMaterial"
        >
          {node.name}
        </Text>
        <Text
          position={[0.02, -0.02, 0.015]}
          fontSize={fontSize * 0.9}
          color="black"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          lineHeight={1}
          letterSpacing={-0.015}
          materialType="MeshStandardMaterial"
        >
          {node.name}
        </Text>
      </group>
    </a.mesh>
  );
};

export default React.memo(Node);
