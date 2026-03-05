import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrthographicCamera } from "three";

export interface CameraApi {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fitToScreen: () => void;
  getZoom: () => number;
  getCamera: () => THREE.Camera;
  controlsRef: React.RefObject<{ enabled: boolean } | null>;
}

interface SceneControlsProps {
  initialZoom?: number;
}

export const SceneControls = forwardRef<CameraApi, SceneControlsProps>(
  function SceneControls({ initialZoom = 1 }, ref) {
    const { camera, invalidate } = useThree();
    const controlsRef = useRef<any>(null);
    const initialZoomRef = useRef(initialZoom);

    // Lock camera straight down
    useEffect(() => {
      camera.position.set(0, 500, 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      invalidate();
    }, [camera, invalidate]);

    useEffect(() => {
      initialZoomRef.current = initialZoom;
    }, [initialZoom]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn() {
          const cam = camera as OrthographicCamera;
          cam.zoom = Math.min(5, cam.zoom * 1.15);
          cam.updateProjectionMatrix();
          invalidate();
        },
        zoomOut() {
          const cam = camera as OrthographicCamera;
          cam.zoom = Math.max(0.2, cam.zoom / 1.15);
          cam.updateProjectionMatrix();
          invalidate();
        },
        reset() {
          const cam = camera as OrthographicCamera;
          cam.zoom = initialZoomRef.current;
          cam.position.set(0, 500, 0);
          cam.up.set(0, 0, -1);
          cam.lookAt(0, 0, 0);
          cam.updateProjectionMatrix();
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
          invalidate();
        },
        fitToScreen() {
          const cam = camera as OrthographicCamera;
          cam.zoom = initialZoomRef.current;
          cam.position.set(0, 500, 0);
          cam.up.set(0, 0, -1);
          cam.lookAt(0, 0, 0);
          cam.updateProjectionMatrix();
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
          invalidate();
        },
        getZoom() {
          return (camera as OrthographicCamera).zoom;
        },
        getCamera() {
          return camera;
        },
        controlsRef,
      }),
      [camera, invalidate],
    );

    return (
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        enableDamping={false}
        screenSpacePanning
        minZoom={0.2}
        maxZoom={5}
        enableZoom
        zoomSpeed={1.2}
        onChange={() => invalidate()}
        onEnd={() => invalidate()}
      />
    );
  },
);
