#!/bin/bash

echo "🧪 Testando webhook WhatsApp via Postman..."

# Teste 1: Mensagem de grupo autorizado (JID: 120363419788242278@g.us)
echo "Teste 1: Grupo autorizado (JID correto)..."
curl -X POST http://localhost:5000/api/whatsapp/webhook/pontualApp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "120363419788242278@g.us",
        "fromMe": false,
        "id": "3A81AF62971E6F7D98D7",
        "participant": "553195343133@s.whatsapp.net"
      },
      "pushName": "Gabriela Santos",
      "status": "SERVER_ACK",
      "message": {
        "conversation": "ajuda"
      },
      "messageType": "conversation",
      "messageTimestamp": 1751461017,
      "instanceId": "5332b391-3bd4-4a2b-b74e-4ac299431bae",
      "source": "ios"
    }
  }'

echo ""
echo "Teste 2: Grupo NÃO autorizado (deve ser ignorado)..."
curl -X POST http://localhost:5000/api/whatsapp/webhook/pontualApp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "120363999999999999@g.us",
        "fromMe": false,
        "id": "3A81AF62971E6F7D98D8",
        "participant": "553195343133@s.whatsapp.net"
      },
      "pushName": "Gabriela Santos",
      "status": "SERVER_ACK",
      "message": {
        "conversation": "tarefas"
      },
      "messageType": "conversation",
      "messageTimestamp": 1751461018,
      "instanceId": "5332b391-3bd4-4a2b-b74e-4ac299431bae",
      "source": "ios"
    }
  }'

echo ""
echo "Teste 3: Mensagem individual (deve ser ignorada)..."
curl -X POST http://localhost:5000/api/whatsapp/webhook/pontualApp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "553195343133@s.whatsapp.net",
        "fromMe": false,
        "id": "3A81AF62971E6F7D98D9"
      },
      "pushName": "Gabriela Santos",
      "status": "SERVER_ACK",
      "message": {
        "conversation": "status"
      },
      "messageType": "conversation",
      "messageTimestamp": 1751461019,
      "instanceId": "5332b391-3bd4-4a2b-b74e-4ac299431bae",
      "source": "ios"
    }
  }'

echo ""
echo "✅ Testes enviados! Verifique os logs no console."