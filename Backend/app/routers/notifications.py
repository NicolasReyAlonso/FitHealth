from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id not in self.active_connections:
            return
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception:
                # Conexión muerta; se limpiará en el próximo disconnect
                pass

notification_manager = NotificationManager()

@router.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket, user_id)
