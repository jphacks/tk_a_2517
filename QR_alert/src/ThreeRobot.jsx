import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeRobot({ sensorData }) {
  const mountRef = useRef();

  useEffect(() => {
    const el = mountRef.current;
    const width = el.clientWidth;
    const height = el.clientHeight;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    // scene & camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 6);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // robot body (box)
    const bodyGeo = new THREE.BoxGeometry(2, 1.2, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, metalness:0.3, roughness:0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    scene.add(body);

    // head
    const headGeo = new THREE.BoxGeometry(0.8, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.0, 0);
    scene.add(head);

    // left arm
    const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
    const armMat = new THREE.MeshStandardMaterial({ color:0x93c5fd });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-1.25, 0, 0);
    scene.add(leftArm);

    // right arm
    const rightArm = leftArm.clone();
    rightArm.position.set(1.25, 0, 0);
    scene.add(rightArm);

    // base (cylinder)
    const baseGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.3, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, -0.9, 0);
    scene.add(base);

    // helper grid
    const grid = new THREE.GridHelper(10, 10, 0x0ea5a2, 0x062a2a);
    scene.add(grid);

    // Resize handler
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Animation
    let frameId;
    const clock = new THREE.Clock();

    function animate() {
      const t = clock.getElapsedTime();
      body.rotation.y = 0.2 * Math.sin(t * 0.7);
      head.rotation.y = 0.3 * Math.sin(t * 1.1);
      leftArm.rotation.z = 0.3 * Math.sin(t * 1.3);
      rightArm.rotation.z = -0.3 * Math.sin(t * 1.3);

      // sensor-driven effect: temperature controls glow color
      if (sensorData) {
        const temp = sensorData.temp || 50;
        // map temperature to color (blue -> yellow -> red)
        const clamped = Math.max(20, Math.min(100, temp));
        const ratio = (clamped - 20) / (100 - 20);
        const color = new THREE.Color().setHSL((1 - ratio) * 0.6, 0.8, 0.5);
        body.material.color.copy(color);
        head.material.color.copy(color);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [sensorData]);

  // overlay canvas for heat/alerts (could be expanded)
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
      <div className="overlay" aria-hidden>
        {/* future: draw heatmap canvas here if needed */}
      </div>
    </div>
  );
}
