#!/bin/bash

echo "🧪 Testando webhook do WhatsApp..."

curl -X POST https://db5526d1-39d7-4465-aa3c-8fff59a35924-00-28kinqyzkeuy7.janeway.replit.dev/api/whatsapp/webhook/pontualApp \
-H "Content-Type: application/json" \
-d '{
  "event": "messages.upsert",
  "data": {
    "messages": [{
      "messageType": "conversation",
      "message": {
        "conversation": "Tarefas"
      },
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test-message-id"
      }
    }]
  }
}'

echo ""
echo "✅ Teste enviado! Verifique os logs no console."