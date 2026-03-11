import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Clock,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { LiveIncident } from "@/services/liveBoardService";

interface Props {
  incidents: LiveIncident[];
  zooming?: boolean;
}

const severityColor: Record<LiveIncident["severity"], number> = {
  low: 0x22c55e,
  moderate: 0xf59e0b,
  high: 0xf97316,
  critical: 0xff355e,
};

function latLngToVector(lat: number, lng: number, radius: number) {
  const phi = MathUtils.degToRad(90 - lat);
  const theta = MathUtils.degToRad(lng + 180);
  return new Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function HolographicEarth({ incidents, zooming = false }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const trackedCount = Math.min(incidents.length, 12);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.4, 7.1);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = SRGBColorSpace;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const disposeMaterial = (material: Material | Material[]) => {
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
        return;
      }
      material.dispose();
    };

    const disposeObject = (object: Object3D) => {
      object.traverse((child) => {
        if ("geometry" in child && child.geometry) {
          child.geometry.dispose();
        }
        if ("material" in child && child.material) {
          disposeMaterial(child.material as Material | Material[]);
        }
      });
    };

    const globeGroup = new Group();
    scene.add(globeGroup);

    const ambient = new AmbientLight(0x4cc9ff, 0.45);
    scene.add(ambient);

    const keyLight = new DirectionalLight(0x9be7ff, 2.2);
    keyLight.position.set(5, 3, 6);
    scene.add(keyLight);

    const rimLight = new PointLight(0x7b61ff, 30, 25, 2);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    const core = new Mesh(
      new SphereGeometry(2.28, 64, 64),
      new MeshPhysicalMaterial({
        color: 0x072245,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.42,
        transparent: true,
        opacity: 0.9,
        roughness: 0.55,
        metalness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.25,
      }),
    );
    globeGroup.add(core);

    const shell = new Mesh(
      new SphereGeometry(2.34, 48, 48),
      new MeshBasicMaterial({
        color: 0x35e0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.16,
      }),
    );
    globeGroup.add(shell);

    const atmosphere = new Mesh(
      new SphereGeometry(2.52, 48, 48),
      new MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.08,
        side: BackSide,
      }),
    );
    globeGroup.add(atmosphere);

    for (let i = -70; i <= 70; i += 20) {
      const radius = 2.32 * Math.cos(MathUtils.degToRad(i));
      const ring = new Mesh(
        new TorusGeometry(Math.max(radius, 0.18), 0.012, 8, 140),
        new MeshBasicMaterial({
          color: i === 0 ? 0x59e6ff : 0x2d9cff,
          transparent: true,
          opacity: i === 0 ? 0.55 : 0.22,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.32 * Math.sin(MathUtils.degToRad(i));
      globeGroup.add(ring);
    }

    for (let i = 0; i < 6; i += 1) {
      const curvePoints: Vector3[] = [];
      for (let step = 0; step <= 100; step += 1) {
        const angle = (step / 100) * Math.PI * 2;
        curvePoints.push(new Vector3(Math.cos(angle) * 2.32, 0, Math.sin(angle) * 2.32));
      }
      const line = new LineLoop(
        new BufferGeometry().setFromPoints(curvePoints),
        new LineBasicMaterial({
          color: 0x1d8cff,
          transparent: true,
          opacity: 0.12,
        }),
      );
      line.rotation.y = (Math.PI / 6) * i;
      line.rotation.z = MathUtils.degToRad(90);
      globeGroup.add(line);
    }

    const stormGeometry = new BufferGeometry();
    const stormCount = reducedMotion ? 600 : 1400;
    const stormPositions = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount; i += 1) {
      const radius = MathUtils.randFloat(3.2, 5.8);
      const theta = MathUtils.randFloat(0, Math.PI * 2);
      const phi = MathUtils.randFloat(0.2, Math.PI - 0.2);
      stormPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      stormPositions[i * 3 + 1] = radius * Math.cos(phi);
      stormPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    stormGeometry.setAttribute("position", new BufferAttribute(stormPositions, 3));

    const storm = new Points(
      stormGeometry,
      new PointsMaterial({
        color: 0x5ee7ff,
        size: reducedMotion ? 0.02 : 0.028,
        transparent: true,
        opacity: 0.7,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(storm);

    const highlighted = incidents.slice(0, 12);
    const incidentGroup = new Group();
    const shockwaves: Mesh[] = [];
    const points: Mesh[] = [];

    highlighted.forEach((incident, index) => {
      const position = latLngToVector(incident.lat, incident.lng, 2.42);
      const point = new Mesh(
        new SphereGeometry(incident.severity === "critical" ? 0.07 : 0.05, 16, 16),
        new MeshBasicMaterial({
          color: severityColor[incident.severity],
          transparent: true,
          opacity: 0.95,
        }),
      );
      point.position.copy(position);
      incidentGroup.add(point);
      points.push(point);

      const shockwave = new Mesh(
        new RingGeometry(0.04, 0.08, 32),
        new MeshBasicMaterial({
        color: severityColor[incident.severity],
        transparent: true,
        opacity: 0.45,
        side: DoubleSide,
      }),
    );
      shockwave.position.copy(position.clone().multiplyScalar(1.005));
      shockwave.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), position.clone().normalize());
      shockwave.userData.phase = index * 0.35;
      incidentGroup.add(shockwave);
      shockwaves.push(shockwave);
    });
    globeGroup.add(incidentGroup);

    const satelliteGroup = new Group();
    const linkPairs = highlighted.slice(0, 6);
    linkPairs.forEach((incident, index) => {
      const start = latLngToVector(incident.lat, incident.lng, 2.42);
      const endIncident = highlighted[(index + 3) % highlighted.length];
      if (!endIncident) return;
      const end = latLngToVector(endIncident.lat, endIncident.lng, 2.42);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(3.55);
      const arc = new Line(
        new BufferGeometry().setFromPoints(new QuadraticBezierCurve3(start, mid, end).getPoints(72)),
        new LineBasicMaterial({
          color: 0x5ef2ff,
          transparent: true,
          opacity: 0.35,
        }),
      );
      satelliteGroup.add(arc);
    });
    globeGroup.add(satelliteGroup);

    const mouse = new Vector2();
    const clock = new Clock();

    const handleMouseMove = (event: MouseEvent) => {
      const bounds = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    };

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    mount.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    let animationFrame = 0;
    const tick = () => {
      const elapsed = clock.getElapsedTime();
      globeGroup.rotation.y += reducedMotion ? 0.0012 : zooming ? 0.0015 : 0.0032;
      globeGroup.rotation.x = MathUtils.lerp(globeGroup.rotation.x, reducedMotion ? 0 : mouse.y * 0.16, 0.04);
      globeGroup.rotation.z = MathUtils.lerp(globeGroup.rotation.z, reducedMotion ? 0 : -mouse.x * 0.08, 0.04);
      storm.rotation.y -= reducedMotion ? 0.0004 : 0.0009;
      storm.rotation.x = Math.sin(elapsed * 0.12) * 0.08;
      shell.rotation.y -= reducedMotion ? 0.0005 : 0.0012;

      points.forEach((point, index) => {
        const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 3.4 + index * 0.6) * 0.28;
        point.scale.setScalar(pulse);
      });

      shockwaves.forEach((shockwave, index) => {
        const phase = ((elapsed * 0.72 + index * 0.13 + shockwave.userData.phase) % 1 + 1) % 1;
        const scale = reducedMotion ? 1.8 : 1 + phase * 5.2;
        shockwave.scale.setScalar(scale);
        const material = shockwave.material as MeshBasicMaterial;
        material.opacity = reducedMotion ? 0.18 : 0.38 * (1 - phase);
      });

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mount.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      disposeObject(scene);
      renderer.dispose();
      mount.innerHTML = "";
    };
  }, [incidents, reducedMotion, zooming]);

  return (
    <div className="relative h-[540px] w-full overflow-hidden rounded-[2rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_center,_rgba(8,28,84,0.55),_rgba(2,6,23,0.1)_52%,_rgba(2,6,23,0)_75%)] shadow-[0_0_80px_rgba(34,211,238,0.18)]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-6 rounded-[1.75rem] border border-cyan-300/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.2),_transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 scanline opacity-40" />
      <div className="pointer-events-none absolute left-8 top-8 rounded-full border border-cyan-300/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-200/70">
        Holographic Earth
      </div>
      <div className="pointer-events-none absolute bottom-8 left-8 right-8 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
        <span>{reducedMotion ? "Low-motion telemetry mode" : "Orbital telemetry active"}</span>
        <span>{trackedCount} tracked anomalies</span>
      </div>
    </div>
  );
}
