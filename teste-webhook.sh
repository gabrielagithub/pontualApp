#!/bin/bash

echo "🧪 Testando webhook do WhatsApp..."

echo "Teste 1: Mensagem de grupo..."
curl -X POST https://db5526d1-39d7-4465-aa3c-8fff59a35924-00-28kinqyzkeuy7.janeway.replit.dev/api/whatsapp/webhook/pontualApp \
-H "Content-Type: application/json" \
-d '{
  "event": "messages.upsert",
  "data": {
    "pushName": "Pontual",
    "messages": [{
      "messageType": "conversation",
      "message": {
        "conversation": "Tarefas"
      },
      "key": {
        "remoteJid": "120363999999999@g.us",
        "participant": "5599999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test-group-message-id"
      }
    }]
  }
}'

echo ""
echo ""
echo "Teste 2: Mensagem individual (deve ser ignorada)..."
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
        "remoteJid": "5599999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test-individual-message-id"
      }
    }]
  }
}'

echo ""
echo "✅ Testes enviados! Verifique os logs no console."