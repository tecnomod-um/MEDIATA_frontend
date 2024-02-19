import React, { useEffect, useState, useRef } from 'react';
import { Canvas, extend} from '@react-three/fiber';
import { WebGLRenderer } from 'three';
import Scene from './scene';

const LandingBackground = () => {
    const [contextLost, setContextLost] = useState(false);
    const [webGLSupported, setWebGLSupported] = useState(true);
    const canvasRef = useRef();

    useEffect(() => {
        const canvasElem = document.createElement('canvas');
        const gl = canvasElem.getContext('webgl') || canvasElem.getContext('experimental-webgl');

        if (!gl) {
            setWebGLSupported(false);
            console.log('WebGL is not supported by your browser or device.');
            return;
        }

        if (!gl.getExtension('WEBGL_lose_context')) {
            console.log('WEBGL_lose_context extension not supported. Fallback handling will be used.');
        }

        const handleContextLost = (event) => {
            event.preventDefault();
            setContextLost(true);
            console.log("WebGL context lost. Attempting to restore...");
        };

        const handleContextRestored = () => {
            setContextLost(false);
            console.log("WebGL context restored. Reinitializing renderer...");
            if (canvasRef.current) {
                const renderer = new WebGLRenderer({ canvas: canvasRef.current });
                extend({ renderer });
            }
        };

        canvasElem.addEventListener('webglcontextlost', handleContextLost);
        canvasElem.addEventListener('webglcontextrestored', handleContextRestored);

        return () => {
            canvasElem.removeEventListener('webglcontextlost', handleContextLost);
            canvasElem.removeEventListener('webglcontextrestored', handleContextRestored);
        };
    }, []);

    if (!webGLSupported) {
        return <div>Your browser or device does not support WebGL. Please try with a different browser or device.</div>;
    }

    return (
        contextLost ?
            <div>WebGL context lost. Attempting to restore...</div> :
            <Canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, height: '100vh', zIndex: -1 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Scene />
            </Canvas>
    );
}

export default LandingBackground;
