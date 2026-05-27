import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { View, Pressable } from 'react-native';

function Crystal(props: any) {
    const mesh = useRef<any>(null);

    useFrame((_: any, delta: number) => {
        if (mesh.current) {
            mesh.current.rotation.x += delta * 0.2;
            mesh.current.rotation.y += delta * 0.3;
        }
    });

    return React.createElement(
        'mesh' as any,
        { ...props, ref: mesh, scale: 1.5 },
        React.createElement('octahedronGeometry' as any, { args: [1, 0] }),
        React.createElement('meshStandardMaterial' as any, {
            color: '#00F5FF',
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8,
        })
    );
}

export default function MemoryCrystal(props: any) {
    return React.createElement(
        Pressable,
        {
            onPress: props.onPress,
            style: { width: '100%', height: 256, alignItems: 'center', justifyContent: 'center' } as any,
        },
        React.createElement(
            View,
            {
                pointerEvents: 'none',
                style: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
            },
            React.createElement(
                Canvas as any,
                {},
                React.createElement('ambientLight' as any, { intensity: 0.5 }),
                React.createElement('spotLight' as any, { position: [10, 10, 10], angle: 0.15, penumbra: 1 }),
                React.createElement('pointLight' as any, { position: [-10, -10, -10] }),
                React.createElement(Crystal as any, { position: [0, 0, 0] })
            )
        )
    );
}
