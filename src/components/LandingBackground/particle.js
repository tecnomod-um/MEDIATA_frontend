import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import distinctColors from "distinct-colors";
import * as THREE from 'three';

const palette = distinctColors({
    count: 50, // Adjust as needed
    chromaMin: 15,
    chromaMax: 95,
    lightMin: 65,
    lightMax: 90,
});

const Particle = ({ zPosition = -5, mouse }) => {
    const mesh = useRef();
    const opacityRef = useRef(1.0);
    const randomColor = new THREE.Color().setRGB(
        palette[Math.floor(Math.random() * palette.length)][0] / 255,
        palette[Math.floor(Math.random() * palette.length)][1] / 255,
        palette[Math.floor(Math.random() * palette.length)][2] / 255
    );

    const [position, velocity] = useMemo(() => {
        // Random position and velocity
        const pos = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            zPosition
        );
        const vel = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
        return [pos, vel];
    }, [zPosition]);

    useFrame(() => {
        // Random movement
        mesh.current.position.add(velocity);

        // Calculate direction to mouse
        const dirToMouse = new THREE.Vector3().subVectors(position, new THREE.Vector3(mouse.current[0], mouse.current[1], zPosition));

        // Apply avoidance behavior based on mouse proximity
        if (dirToMouse.length() < 1.5) {
            dirToMouse.normalize();
            velocity.sub(dirToMouse.multiplyScalar(0.03));
        }

        // Fade away when out of view
        if (mesh.current.position.length() > 5) {
            opacityRef.current -= 0.005;
            if (opacityRef.current > 0) {
                mesh.current.material.opacity = opacityRef.current;
            } else {
                mesh.current.visible = false; // Hide the particle when opacity reaches 0
            }
        }
    });

    // Inside the Particle component
    return (
        <mesh ref={mesh} position={position} renderOrder={1}>
            <sphereGeometry attach="geometry" args={[0.1, 16, 16]} />
            <meshStandardMaterial attach="material" color={randomColor} emissive="black" emissiveIntensity={0.2} transparent opacity={opacityRef.current} />
        </mesh>
    );
}

export default Particle;
