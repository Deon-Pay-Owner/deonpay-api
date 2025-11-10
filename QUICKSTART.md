# API Worker - Guía de Inicio Rápido

Esta guía te ayudará a poner en funcionamiento el API Worker de DeonPay en minutos.

## Paso 1: Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cd api-worker
cp .dev.vars.example .dev.vars
```

Edita `.dev.vars` con tus credenciales de Supabase:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
ENVIRONMENT=development
```

**¿Dónde encontrar estas credenciales?**

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Settings → API
4. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **Project API keys → anon/public** → `SUPABASE_ANON_KEY`

## Paso 2: Iniciar el Worker Localmente

```bash
npm run dev
```

El API estará disponible en: `http://localhost:8787`

## Paso 3: Probar el API

### Health Check

```bash
curl http://localhost:8787
```

Respuesta esperada:
```json
{
  "service": "DeonPay API",
  "version": "1.0.0",
  "status": "healthy",
  "environment": "development"
}
```

### Crear un API Key para Pruebas

Primero necesitas un API key. Usa el Dashboard de tu merchant para crear uno, o inserta uno manualmente en la base de datos:

```sql
-- En Supabase SQL Editor
INSERT INTO api_keys (merchant_id, name, key_type, public_key, secret_key_hash, secret_key_prefix, is_active)
VALUES (
  'tu-merchant-id-uuid',
  'Test Key',
  'test',
  'pk_test_12345678901234567890123456789012',  -- Tu clave pública
  'dummy-hash',  -- En producción, esto sería un hash bcrypt
  'pk_test_',
  true
);
```

### Crear un Payment Intent

```bash
curl -X POST http://localhost:8787/api/v1/payment_intents \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10050,
    "currency": "MXN",
    "capture_method": "automatic"
  }'
```

Respuesta esperada:
```json
{
  "id": "uuid-generado",
  "merchant_id": "tu-merchant-id",
  "amount": 10050,
  "currency": "MXN",
  "status": "requires_payment_method",
  "capture_method": "automatic",
  "created_at": "2025-11-09T..."
}
```

### Confirmar el Payment Intent

```bash
curl -X POST http://localhost:8787/api/v1/payment_intents/{payment-intent-id}/confirm \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025,
      "token_ref": "tok_test_123"
    }
  }'
```

### Crear un Customer

```bash
curl -X POST http://localhost:8787/api/v1/customers \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "name": "Juan Pérez",
    "phone": "+525512345678"
  }'
```

### Listar Payment Intents

```bash
curl http://localhost:8787/api/v1/payment_intents?limit=10 \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012"
```

### Crear un Refund

```bash
curl -X POST http://localhost:8787/api/v1/refunds \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012" \
  -H "Content-Type: application/json" \
  -d '{
    "charge_id": "uuid-del-charge",
    "amount": 5000,
    "reason": "Customer requested refund"
  }'
```

### Ver Balance

```bash
curl http://localhost:8787/api/v1/balance/summary \
  -H "Authorization: Bearer pk_test_12345678901234567890123456789012"
```

## Paso 4: Verificar Datos en Supabase

Ve a tu proyecto en Supabase → Table Editor y verifica que se crearon los registros en:

- `payment_intents`
- `charges`
- `balance_transactions` (creados automáticamente por triggers)
- `customers`
- `refunds`

## Endpoints Disponibles

### Payment Intents
- `POST /api/v1/payment_intents` - Crear
- `GET /api/v1/payment_intents/:id` - Obtener uno
- `GET /api/v1/payment_intents` - Listar
- `PATCH /api/v1/payment_intents/:id` - Actualizar
- `POST /api/v1/payment_intents/:id/confirm` - Confirmar pago
- `POST /api/v1/payment_intents/:id/capture` - Capturar pago
- `POST /api/v1/payment_intents/:id/cancel` - Cancelar

### Customers
- `POST /api/v1/customers` - Crear
- `GET /api/v1/customers/:id` - Obtener uno
- `GET /api/v1/customers` - Listar
- `PATCH /api/v1/customers/:id` - Actualizar
- `DELETE /api/v1/customers/:id` - Eliminar

### Refunds
- `POST /api/v1/refunds` - Crear
- `GET /api/v1/refunds/:id` - Obtener uno
- `GET /api/v1/refunds` - Listar

### Balance
- `GET /api/v1/balance/transactions` - Listar transacciones
- `GET /api/v1/balance/transactions/:id` - Obtener una
- `GET /api/v1/balance/summary` - Ver resumen de balance

## Troubleshooting

### Error: "Supabase configuration missing"

Verifica que `.dev.vars` existe y tiene las variables correctas.

### Error: "Invalid or inactive API key"

1. Verifica que el API key existe en la tabla `api_keys`
2. Verifica que `is_active = true`
3. Verifica que `merchant_id` es correcto

### Error: "Payment intent not found"

El RLS está bloqueando el acceso. Verifica que:
1. El merchant_id del payment intent coincide con el merchant_id del API key
2. Las políticas RLS están activas

### El worker no inicia

```bash
# Verifica que wrangler está instalado
npx wrangler --version

# Reinstala dependencias
rm -rf node_modules package-lock.json
npm install
```

## Próximos Pasos

1. **Agregar Acquirer Adapters**: Conectar con Stripe, Conekta, etc.
2. **Implementar Routing Logic**: Selección inteligente de acquirer
3. **Agregar Webhooks**: Sistema de notificaciones
4. **Agregar Rate Limiting**: Protección contra abuso
5. **Implementar Idempotency Keys**: Prevenir duplicados

## Recursos

- [Documentación Completa](./README.md)
- [Canonical Schema](../docs/canonical-schema-mvp.md)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Type check
npm run typecheck

# Deploy a producción
npm run deploy

# Ver logs (después de deploy)
npx wrangler tail
```

## Ejemplo Completo de Flujo de Pago

```bash
# 1. Crear customer
CUSTOMER_ID=$(curl -X POST http://localhost:8787/api/v1/customers \
  -H "Authorization: Bearer pk_test_..." \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}' \
  | jq -r '.id')

# 2. Crear payment intent
PI_ID=$(curl -X POST http://localhost:8787/api/v1/payment_intents \
  -H "Authorization: Bearer pk_test_..." \
  -H "Content-Type: application/json" \
  -d "{\"amount\":10050,\"currency\":\"MXN\",\"customer_id\":\"$CUSTOMER_ID\"}" \
  | jq -r '.id')

# 3. Confirmar pago
curl -X POST http://localhost:8787/api/v1/payment_intents/$PI_ID/confirm \
  -H "Authorization: Bearer pk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    }
  }'

# 4. Ver balance
curl http://localhost:8787/api/v1/balance/summary \
  -H "Authorization: Bearer pk_test_..."
```

¡Listo! Tu API Worker está funcionando correctamente.
