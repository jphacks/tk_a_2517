import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function MultiPartRobot({ robotData, selectedPart, onPartClick }) {
  const mountRef = useRef();
  
  // ロボットIDに基づいて頭部の形状を決定
  const getHeadGeometry = (robotId) => {
    if (robotId === 'ROBOT_001') {
      // 三角形の頭部（ConeGeometry）
      return new THREE.ConeGeometry(0.4, 0.8, 3);
    } else if (robotId === 'ROBOT_002') {
      // 丸型の頭部（SphereGeometry）
      return new THREE.SphereGeometry(0.4, 16, 12);
    } else if (robotId === 'ROBOT_003') {
      // 四角形の頭部（BoxGeometry）
      return new THREE.BoxGeometry(0.6, 0.6, 0.6);
    } else {
      // デフォルトは丸型
      return new THREE.SphereGeometry(0.4, 16, 12);
    }
  };

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
    camera.position.set(0, 2, 8);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // ロボット部位の定義（丸みを帯びた形状）
    const robotId = robotData?.robotId || 'ROBOT_001';
    const parts = {
      head: { 
        geometry: getHeadGeometry(robotId), 
        position: [0, 2.2, 0], 
        color: 0x60a5fa,
        name: '頭部'
      },
      left_arm: { 
        geometry: new THREE.CapsuleGeometry(0.15, 1.0, 4, 8), 
        position: [-1.4, 0.5, 0], 
        color: 0x93c5fd,
        name: '左腕'
      },
      right_arm: { 
        geometry: new THREE.CapsuleGeometry(0.15, 1.0, 4, 8), 
        position: [1.4, 0.5, 0], 
        color: 0x93c5fd,
        name: '右腕'
      },
      torso: { 
        geometry: new THREE.CapsuleGeometry(0.8, 1.2, 4, 8), 
        position: [0, 0.5, 0], 
        color: 0x7dd3fc,
        name: '胴体'
      },
      left_leg: { 
        geometry: new THREE.CapsuleGeometry(0.2, 0.8, 4, 8), 
        position: [-0.6, -1.2, 0], 
        color: 0xa78bfa,
        name: '左脚'
      },
      right_leg: { 
        geometry: new THREE.CapsuleGeometry(0.2, 0.8, 4, 8), 
        position: [0.6, -1.2, 0], 
        color: 0xa78bfa,
        name: '右脚'
      },
      base: { 
        geometry: new THREE.CylinderGeometry(1.2, 1.2, 0.4, 32), 
        position: [0, -2.2, 0], 
        color: 0x334155,
        name: 'ベース'
      }
    };

    // ロボット部位メッシュを作成
    const robotParts = {};
    Object.keys(parts).forEach(partId => {
      const part = parts[partId];
      const material = new THREE.MeshStandardMaterial({ 
        color: part.color, 
        metalness: 0.3, 
        roughness: 0.5 
      });
      const mesh = new THREE.Mesh(part.geometry, material);
      mesh.position.set(...part.position);
      mesh.userData = { partId };
      scene.add(mesh);
      robotParts[partId] = mesh;
    });

    // グリッド
    const grid = new THREE.GridHelper(10, 10, 0x0ea5a2, 0x062a2a);
    scene.add(grid);

    // レイキャスティング用のレイヤー
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // マウスクリックイベント
    const onMouseClick = (event) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Object.values(robotParts));

      if (intersects.length > 0) {
        const clickedPart = intersects[0].object.userData.partId;
        onPartClick(clickedPart);
      }
    };

    el.addEventListener('click', onMouseClick);

    // リサイズハンドラー
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // アニメーション
    let frameId;
    const clock = new THREE.Clock();

    function animate() {
      const t = clock.getElapsedTime();
      
      // 基本アニメーション
      robotParts.torso.rotation.y = 0.1 * Math.sin(t * 0.5);
      robotParts.head.rotation.y = 0.2 * Math.sin(t * 0.8);
      robotParts.left_arm.rotation.z = 0.3 * Math.sin(t * 1.2);
      robotParts.right_arm.rotation.z = -0.3 * Math.sin(t * 1.2);
      robotParts.left_leg.rotation.x = 0.2 * Math.sin(t * 1.5);
      robotParts.right_leg.rotation.x = -0.2 * Math.sin(t * 1.5);

      // センサーデータに基づく色変更
      if (robotData && robotData.parts) {
        robotData.parts.forEach(partData => {
          const mesh = robotParts[partData.id];
          if (mesh) {
            const baseColor = parts[partData.id].color;
            let statusColor = baseColor;
            
            switch (partData.status) {
              case 'critical':
                statusColor = 0xff0000; // 鮮明な赤
                break;
              case 'warning':
                statusColor = 0xff8800; // 鮮明なオレンジ
                break;
              case 'normal':
                statusColor = 0x00ff00; // 鮮明な緑
                break;
            }
            
            mesh.material.color.setHex(statusColor);
            
            // 選択された部位をハイライト
            if (selectedPart === partData.id) {
              mesh.material.emissive.setHex(0x444444);
              mesh.scale.setScalar(1.1);
            } else {
              mesh.material.emissive.setHex(0x000000);
              mesh.scale.setScalar(1.0);
            }
          }
        });
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('click', onMouseClick);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [robotData, selectedPart, onPartClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 操作説明 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        Click on robot parts to see details
      </div>
    </div>
  );
}
