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
        print(f"Buscando conexiones para user_id={user_id} para enviar: {message}")
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                    print(f"Notificación enviada a user_id={user_id}")
                except Exception as e:
                    print(f"Error enviando a {user_id}: {e}")
        else:
            print(f"⚠️ user_id={user_id} no tiene conexiones activas")

notification_manager = NotificationManager()

@router.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    print(f"🔗 Nueva conexión de notificaciones para user_id={user_id}")
    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"🔌 Desconexión de notificaciones para user_id={user_id}")
        notification_manager.disconnect(websocket, user_id)
