import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useResourceSocket } from '@/hooks/useResourceSocket';

interface Resource {
  id: number;
  name: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  last_updated: string;
}

interface ResourceMapProps {
  height?: string;
  onResourceSelect?: (resource: Resource) => void;
}

export const ResourceMap: React.FC<ResourceMapProps> = ({
  height = 'h-96',
  onResourceSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const { subscribe } = useResourceSocket();

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: Cesium.createWorldTerrain(),
      animation: true,
      timeline: true,
      geocoder: true,
      baseLayerPicker: true,
      navigationHelpButton: true,
      infoBox: true,
      selectionIndicator: true,
    });

    // Set initial camera position (India)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 500000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear existing entities
    viewer.entities.removeAll();

    // Add resource markers
    resources.forEach((resource) => {
      const iconColor = getResourceColor(resource.type, resource.status);
      const icon = getResourceIcon(resource.type);

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(resource.longitude, resource.latitude),
        point: {
          pixelSize: 12,
          color: iconColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: resource.name,
          font: '12px Helvetica',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -15),
        },
        properties: {
          ...resource,
          type: 'resource',
        },
      });

      // Add click handler
      viewer.screenSpaceEventHandler.setInputAction(() => {
        const pickedObject = viewer.scene.pick(
          new Cesium.Cartesian2(event.position.x, event.position.y)
        );

        if (Cesium.defined(pickedObject?.id) && pickedObject.id.properties?.type === 'resource') {
          onResourceSelect?.(resource);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    });
  }, [resources, onResourceSelect]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const handleUpdate = (data: any) => {
      if (data.type === 'location_update') {
        setResources((prev) =>
          prev.map((r) =>
            r.id === data.resource_id
              ? {
                  ...r,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  speed: data.speed,
                  heading: data.heading,
                  last_updated: data.timestamp,
                }
              : r
          )
        );
      } else if (data.type === 'status_change') {
        setResources((prev) =>
          prev.map((r) =>
            r.id === data.resource_id ? { ...r, status: data.status } : r
          )
        );
      }
    };

    return subscribe(handleUpdate);
  }, [subscribe]);

  return (
    <div
      ref={containerRef}
      className={`${height} w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100`}
    />
  );
};

function getResourceColor(
  type: string,
  status: string
): Cesium.Color {
  const colors: Record<string, Record<string, Cesium.Color>> = {
    ambulance: {
      available: Cesium.Color.GREEN,
      busy: Cesium.Color.YELLOW,
      offline: Cesium.Color.GRAY,
    },
    drone: {
      available: Cesium.Color.BLUE,
      busy: Cesium.Color.ORANGE,
      offline: Cesium.Color.GRAY,
    },
    rescue: {
      available: Cesium.Color.PURPLE,
      busy: Cesium.Color.RED,
      offline: Cesium.Color.GRAY,
    },
  };

  return colors[type]?.[status] || Cesium.Color.GRAY;
}

function getResourceIcon(type: string): string {
  const icons: Record<string, string> = {
    ambulance: '🚑',
    drone: '🚁',
    rescue: '👨‍🚒',
  };

  return icons[type] || '📍';
}
