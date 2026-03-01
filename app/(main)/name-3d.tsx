"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

const Name3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / 200, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, 200);
    container.appendChild(renderer.domElement);

    let textMesh: THREE.Mesh | null = null;
    let animationId: number;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x0f0, 2, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0f0, 1, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Mouse tracking
    let mouseX = 0;
    let mouseY = 0;
    let isHovering = false;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleMouseEnter = () => {
      isHovering = true;
    };

    const handleMouseLeave = () => {
      isHovering = false;
      mouseX = 0;
      mouseY = 0;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Load font and create text
    const loader = new FontLoader();
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
      (font) => {
        const geometry = new TextGeometry("Jui-Yu Hung", {
          font: font,
          size: 1.1,
          depth: 0.4,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.03,
          bevelOffset: 0,
          bevelSegments: 5,
        });

        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0x0f0,
          metalness: 0.7,
          roughness: 0.3,
        });

        textMesh = new THREE.Mesh(geometry, material);
        scene.add(textMesh);

        // Add edge glow
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const line = new THREE.LineSegments(edges, lineMaterial);
        textMesh.add(line);

        console.log("3D text loaded successfully");
      },
      undefined,
      (error) => {
        console.error("Error loading font:", error);
      }
    );

    // Animation
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (textMesh) {
        if (isHovering) {
          textMesh.rotation.y = mouseX * 0.5;
          textMesh.rotation.x = mouseY * 0.3;
        } else {
          // Smoothly return to neutral position
          textMesh.rotation.y *= 0.95;
          textMesh.rotation.x *= 0.95;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      camera.aspect = width / 200;
      camera.updateProjectionMatrix();
      renderer.setSize(width, 200);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      mountedRef.current = false;
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[200px] cursor-pointer overflow-hidden" />
  );
};

export default Name3D;
