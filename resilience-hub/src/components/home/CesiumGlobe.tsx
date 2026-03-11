import { useEffect, useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";

interface Props {
  zooming?: boolean;
}

const GLOBE_ALTITUDE = 7_800_000;
const GLOBE_LONGITUDE = 78;
const GLOBE_LATITUDE = 18;

export default function CesiumGlobe({ zooming = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!containerRef.current || viewerRef.current) return;

      const cesium = await import("cesium");
      if (cancelled || !containerRef.current) return;

      (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";
      cesiumRef.current = cesium;

      const viewer = new cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        infoBox: false,
        selectionIndicator: false,
        terrain: undefined,
      });

      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.moon.show = false;
      viewer.scene.sun.show = true;
      viewer.clock.shouldAnimate = true;
      viewer.scene.requestRenderMode = false;
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.scene.screenSpaceCameraController.enableTilt = false;
      viewer.scene.screenSpaceCameraController.enableTranslate = false;
      viewer.scene.screenSpaceCameraController.enableZoom = false;
      viewer.scene.screenSpaceCameraController.enableLook = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = GLOBE_ALTITUDE;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = GLOBE_ALTITUDE;

      viewer.camera.setView({
        destination: cesium.Cartesian3.fromDegrees(GLOBE_LONGITUDE, GLOBE_LATITUDE, GLOBE_ALTITUDE),
        orientation: {
          heading: 0,
          pitch: cesium.Math.toRadians(-8),
          roll: 0,
        },
      });

      viewerRef.current = viewer;
    }

    setup().catch(() => {});

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium) return;

    const handle = window.setInterval(() => {
      if (!zooming) {
        viewer.scene.camera.rotate(cesium.Cartesian3.UNIT_Z, -0.0012);
      }
    }, 16);

    return () => {
      window.clearInterval(handle);
    };
  }, [zooming]);

  return (
    <div
      className={`relative w-[500px] h-[500px] min-w-[500px] min-h-[500px] max-w-[500px] max-h-[500px] rounded-full overflow-hidden border border-cyan-500/40 shadow-[0_0_80px_rgba(34,211,238,0.25)] transition-all duration-700 ${
        zooming ? "scale-[2.4] opacity-0" : "scale-100 opacity-100"
      }`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <style>{`
        .cesium-widget-credits { display: none !important; }
      `}</style>
    </div>
  );
}
