from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
from datetime import datetime
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for live resource updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, List[WebSocket]] = {}  # resource_id -> [websockets]
    
    async def connect(self, websocket: WebSocket):
        """Accept and register new connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Remove websocket connection"""
        self.active_connections.remove(websocket)
        
        # Remove from subscriptions
        for resource_id in list(self.subscriptions.keys()):
            if websocket in self.subscriptions[resource_id]:
                self.subscriptions[resource_id].remove(websocket)
                if not self.subscriptions[resource_id]:
                    del self.subscriptions[resource_id]
    
    async def subscribe(self, websocket: WebSocket, resource_id: str):
        """Subscribe to resource updates"""
        if resource_id not in self.subscriptions:
            self.subscriptions[resource_id] = []
        if websocket not in self.subscriptions[resource_id]:
            self.subscriptions[resource_id].append(websocket)
    
    async def unsubscribe(self, websocket: WebSocket, resource_id: str):
        """Unsubscribe from resource updates"""
        if resource_id in self.subscriptions:
            if websocket in self.subscriptions[resource_id]:
                self.subscriptions[resource_id].remove(websocket)
                if not self.subscriptions[resource_id]:
                    del self.subscriptions[resource_id]
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
    
    async def broadcast_to_resource(self, resource_id: str, message: dict):
        """Broadcast to clients subscribed to a specific resource"""
        if resource_id in self.subscriptions:
            for connection in self.subscriptions[resource_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending to connection: {e}")
    
    async def handle_location_update(self, resource_id: int, data: dict):
        """Handle incoming location update"""
        message = {
            "type": "location_update",
            "resource_id": resource_id,
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "speed": data.get("speed", 0),
            "heading": data.get("heading", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_resource(str(resource_id), message)
        return message
    
    async def handle_dispatch_alert(self, dispatch_data: dict):
        """Handle dispatch alert"""
        message = {
            "type": "dispatch_alert",
            "dispatch_id": dispatch_data.get("dispatch_id"),
            "resource_id": dispatch_data.get("resource_id"),
            "resource_name": dispatch_data.get("resource_name"),
            "disaster_location": dispatch_data.get("disaster_location"),
            "severity": dispatch_data.get("severity"),
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(message)
        return message
    
    async def handle_status_change(self, resource_id: int, status: str):
        """Handle resource status change"""
        message = {
            "type": "status_change",
            "resource_id": resource_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_resource(str(resource_id), message)
        await self.broadcast(message)
        return message


# Global connection manager
manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket):
    """Handle WebSocket connection lifecycle"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")
            
            if message_type == "subscribe":
                resource_id = message.get("resource_id")
                await manager.subscribe(websocket, str(resource_id))
                await websocket.send_json({
                    "type": "subscription_confirmed",
                    "resource_id": resource_id
                })
            
            elif message_type == "unsubscribe":
                resource_id = message.get("resource_id")
                await manager.unsubscribe(websocket, str(resource_id))
                await websocket.send_json({
                    "type": "unsubscription_confirmed",
                    "resource_id": resource_id
                })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)
