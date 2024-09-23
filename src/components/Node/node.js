import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { DoubleSide, TextureLoader } from 'three';
import { useSpring, a } from '@react-spring/three';
import nodeIcon from "../../resources/images/node_image.png";

const Node = ({ node, onNodeClick, isDragging, globalIsDragging, nodeSize, descriptionSize, fontSize, viewport }) => {
    const ref = useRef();
    const auraRef = useRef();
    const textRef = useRef();
    const backgroundRef = useRef();
    const descriptionRef = useRef();
    const descriptionBackgroundRef = useRef();
    const rippleRef = useRef();
    const texture = useLoader(TextureLoader, nodeIcon);

    const [hovered, setHovered] = useState(false);
    const [descriptionHeight, setDescriptionHeight] = useState(descriptionSize[1]);
    const [rippleActive, setRippleActive] = useState(false);
    const [clickDelayActive, setClickDelayActive] = useState(false);
    const [backgroundWidth, setBackgroundWidth] = useState(nodeSize * 1.5);

    const { opacity: hoverOpacity } = useSpring({
        opacity: hovered && !isDragging && !globalIsDragging && !clickDelayActive ? 1 : 0,
        config: { duration: 200 },
    });

    const { scale } = useSpring({
        scale: hovered && !isDragging && !globalIsDragging && !clickDelayActive ? [1, 1, 1] : [0, 1, 1],
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

    const interpolatedOpacity = fadeInProps.opacity.to(opacity => opacity);

    const updatePosition = useCallback((clock) => {
        if (ref.current) {
            const elapsedTime = clock.getElapsedTime();
            const targetY = node.position.y + Math.sin(elapsedTime) * 0.1;

            if (!isDragging)
                ref.current.position.y = ref.current.position.y + (targetY - ref.current.position.y) * 0.1;
            else
                ref.current.position.y = node.position.y;
        }
    }, [isDragging, node.position.y]);

    const updateAuraScale = useCallback((clock) => {
        if (auraRef.current) {
            const scale = 1 + 0.05 * Math.sin(clock.getElapsedTime() * 1.5);
            auraRef.current.scale.set(scale, scale, scale);
        }
    }, []);

    useFrame(({ clock }) => {
        updatePosition(clock);
        updateAuraScale(clock);
    });

    useEffect(() => {
        if (ref.current)
            ref.current.userData.nodeId = node.nodeId;
    }, [node.nodeId]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (descriptionRef.current) {
                const boundingBox = descriptionRef.current.geometry?.boundingBox;
                if (boundingBox) {
                    const textHeight = boundingBox.max.y - boundingBox.min.y;
                    setDescriptionHeight(textHeight + 0.2);
                }
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [node.description, hovered]);

    useEffect(() => {
        const disableRaycast = (ref) => {
            if (ref.current) {
                ref.current.traverse((child) => {
                    child.raycast = () => null;
                });
            }
        };
        disableRaycast(auraRef);
        disableRaycast(textRef);
        disableRaycast(backgroundRef);
        disableRaycast(descriptionBackgroundRef);
        disableRaycast(descriptionRef);
    }, []);

    useEffect(() => {
        if (textRef.current) {
            const boundingBox = textRef.current.geometry.boundingBox;
            if (boundingBox) {
                const textWidth = boundingBox.max.x - boundingBox.min.x;
                setBackgroundWidth(textWidth + 0.4);
            }
        }
    }, [node.name, viewport]);

    const handleDoubleClick = () => {
        setRippleActive(true);
        onNodeClick(node.nodeId);
    };

    const handleSingleClick = () => {
        if (navigator.maxTouchPoints > 0) {
            setRippleActive(true);
            onNodeClick(node.nodeId);
        } else {
            setClickDelayActive(true);
            setTimeout(() => setClickDelayActive(false), 1200);
        }
    };

    const descriptionVisibility = useSpring({
        opacity: !clickDelayActive ? 1 : 0,
        config: { duration: 200 },
    });

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
                    color={node.color}  // Use node.color prop
                    transparent
                    opacity={interpolatedOpacity.to(o => 0.3 * o)}
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
                        color={node.color}  // Use node.color prop
                        transparent
                        opacity={rippleOpacity.to(ro => ro * interpolatedOpacity)}
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

            <a.mesh ref={descriptionBackgroundRef} position={[0, nodeSize * 1.1, 0.04]} scale={scale} {...descriptionVisibility} {...fadeInProps}>
                <planeGeometry args={[descriptionSize[0], descriptionHeight]} />
                <a.meshBasicMaterial color="#1a1a1a" transparent opacity={hoverOpacity} />
            </a.mesh>
            <a.group position={[0, nodeSize * 1.1, 0.05]} scale={scale} {...descriptionVisibility}>
                <Text
                    ref={descriptionRef}
                    fontSize={fontSize*0.75}
                    color="white"
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
            <a.mesh ref={backgroundRef} position={[0, -nodeSize * 0.7, 0.01]}>
                <planeGeometry args={[backgroundWidth, nodeSize * 0.35]} />
                <a.meshBasicMaterial color="white" transparent opacity={interpolatedOpacity.to(o => 0.7 * o)} />
            </a.mesh>
            <Text
                ref={textRef}
                position={[0, -nodeSize * 0.7, 0.02]}
                fontSize={fontSize}
                color="black"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="white"
                onPointerDown={(e) => e.stopPropagation()}
                onSync={() => {
                    if (textRef.current) {
                        const boundingBox = textRef.current.geometry.boundingBox;
                        if (boundingBox) {
                            const textWidth = boundingBox.max.x - boundingBox.min.x;
                            setBackgroundWidth(textWidth + 0.4);
                        }
                    }
                }}
                opacity={interpolatedOpacity}
            >
                {node.name}
            </Text>
        </a.mesh>
    );
}

export default Node;
