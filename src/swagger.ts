export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pharma Chain PQC Prototype API',
    version: '0.1.0',
    description: 'API académica con datos ficticios para trazabilidad de lotes farmacéuticos.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/health': {
      get: { summary: 'Estado del servicio', responses: { '200': { description: 'OK' } } },
    },
    '/actors': {
      post: { summary: 'Registra un actor', responses: { '201': { description: 'Creado' } } },
    },
    '/lots': {
      post: {
        summary: 'Crea un lote como fabricante',
        responses: { '201': { description: 'Creado' } },
      },
    },
    '/lots/{id}': {
      get: { summary: 'Consulta un lote', responses: { '200': { description: 'Lote' } } },
    },
    '/lots/{id}/history': {
      get: { summary: 'Consulta el historial', responses: { '200': { description: 'Historial' } } },
    },
    '/lots/{id}/transfer': {
      post: {
        summary: 'Transfiere custodia',
        responses: { '201': { description: 'Transferido' } },
      },
    },
    '/lots/{id}/verify': {
      get: {
        summary: 'Verifica autenticidad',
        responses: { '200': { description: 'Resultado de verificación' } },
      },
    },
  },
} as const;
