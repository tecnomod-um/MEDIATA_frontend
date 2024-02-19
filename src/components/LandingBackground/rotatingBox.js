import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';

const RotatingBox = ({ position, rotationSpeed = 0.01, size = [2, 2, 2] }) => {
    const mesh = useRef();

    useFrame(() => {
        if (mesh.current) {
            mesh.current.rotation.x += rotationSpeed;
            mesh.current.rotation.y += rotationSpeed;
        }
    });

    return (
        <Box ref={mesh} args={size} position={position}>
            <meshStandardMaterial attach="material" color="#e63946" />
        </Box>
    );
}

export default RotatingBox;
