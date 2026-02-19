import React, { useState } from 'react';
import { ResourceMap } from '@/components/ResourceMap';
import { ResourceTracker } from '@/components/ResourceTracker';
import { DispatchPanel } from '@/components/DispatchPanel';
import { Resource } from '@/services/resourceService';
import { AlertCircle } from 'lucide-react';

export const ResourceCoordination: React.FC = () => {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  const handleDispatch = (recommendation: any) => {
    setDispatchAlert(`${recommendation.resource_name} has been dispatched!`);
    setTimeout(() => setDispatchAlert(null), 5000);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          🚑 Resource Coordination System
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Real-time emergency resource tracking and dispatch management
        </p>
      </div>

      {/* Alert Banner */}
      {dispatchAlert && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {dispatchAlert}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Map - Left side (takes 2 columns on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
              <ResourceMap
                height="h-full"
                onResourceSelect={setSelectedResource}
              />
            </div>

            {/* Selected Resource Details */}
            {selectedResource && (
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="font-semibold text-lg mb-2">{selectedResource.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium capitalize">{selectedResource.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium capitalize">{selectedResource.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Latitude</p>
                    <p className="font-medium">{selectedResource.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Longitude</p>
                    <p className="font-medium">{selectedResource.longitude.toFixed(6)}</p>
                  </div>
                  {selectedResource.speed > 0 && (
                    <>
                      <div>
                        <p className="text-gray-500">Speed</p>
                        <p className="font-medium">{selectedResource.speed.toFixed(1)} km/h</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Heading</p>
                        <p className="font-medium">{selectedResource.heading.toFixed(1)}°</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* Resource Tracker */}
            <div className="flex-1 overflow-hidden">
              <ResourceTracker
                onSelectResource={setSelectedResource}
                selectedResource={selectedResource}
              />
            </div>

            {/* Dispatch Panel */}
            <div className="flex-1 overflow-y-auto">
              <DispatchPanel onDispatch={handleDispatch} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-600">
        <p>Phase 3: Resource Coordination System - Real-time Emergency Response</p>
      </div>
    </div>
  );
};

export default ResourceCoordination;
