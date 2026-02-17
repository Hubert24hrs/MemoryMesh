import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { View } from 'react-native';
import * as THREE from 'three';

function Crystal(props: any) {
    const mesh = useRef<THREE.Mesh>(null!);

    useFrame((state, delta) => {
        mesh.current.rotation.x += delta * 0.2;
        mesh.current.rotation.y += delta * 0.3;
    });

    return (
        <mesh
            {...props}
            ref={mesh}
            scale={1.5}
        >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
                color={'#00F5FF'}
                roughness={0.1}
                metalness={0.8}
                transparent
                opacity={0.8}
            />
        </mesh>
    );
}

export default function MemoryCrystal() {
    return (
        <View className="h-64 w-full items-center justify-center">
            <Canvas>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                <pointLight position={[-10, -10, -10]} />
                <Crystal position={[0, 0, 0]} />
            </Canvas>
        </View>
    );
}
