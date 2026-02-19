const API_BASE_URL = 'http://localhost:8000';

export interface Resource {
  id: number;
  name: string;
  type: 'ambulance' | 'drone' | 'rescue';
  status: 'available' | 'busy' | 'offline';
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  last_updated: string;
  created_at: string;
}

export interface DispatchRequest {
  disaster_lat: number;
  disaster_lon: number;
  disaster_type: string;
  severity_score: number;
  resource_type_priority?: string[];
}

export interface DispatchRecommendation {
  resource_id: number;
  resource_name: string;
  resource_type: string;
  distance_km: number;
  current_location: {
    latitude: number;
    longitude: number;
  };
  estimated_arrival_minutes: number;
  reason: string;
}

class ResourceService {
  async getResources(status?: string, resourceType?: string): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (resourceType) params.append('resource_type', resourceType);

    const response = await fetch(`${API_BASE_URL}/resources?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch resources');
    return response.json();
  }

  async getResource(id: number): Promise<Resource> {
    const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch resource ${id}`);
    return response.json();
  }

  async createResource(resource: Omit<Resource, 'id' | 'last_updated' | 'created_at'>): Promise<Resource> {
    const response = await fetch(`${API_BASE_URL}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });

    if (!response.ok) throw new Error('Failed to create resource');
    return response.json();
  }

  async updateLocation(
    resourceId: number,
    latitude: number,
    longitude: number,
    speed: number = 0,
    heading: number = 0
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/resources/update-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource_id: resourceId,
        latitude,
        longitude,
        speed,
        heading,
      }),
    });

    if (!response.ok) throw new Error('Failed to update location');
    return response.json();
  }

  async getNearbyResources(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    status: string = 'available'
  ): Promise<any[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius_km: radiusKm.toString(),
      status,
    });

    const response = await fetch(`${API_BASE_URL}/resources/nearby?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch nearby resources');
    return response.json();
  }

  async autoDispatch(request: DispatchRequest): Promise<DispatchRecommendation> {
    const response = await fetch(`${API_BASE_URL}/dispatch/auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to dispatch resource');
    return response.json();
  }

  async getActiveDispatch(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/dispatch/active`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch active dispatch records');
    return response.json();
  }

  async updateDispatchStatus(dispatchId: number, status: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dispatch/${dispatchId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_status: status }),
    });

    if (!response.ok) throw new Error('Failed to update dispatch status');
    return response.json();
  }
}

export default new ResourceService();
