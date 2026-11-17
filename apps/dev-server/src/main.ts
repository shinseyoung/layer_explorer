import { createDevServer } from './server';

const PORT = Number(process.env.PORT ?? 4400);
createDevServer().listen(PORT, '127.0.0.1', () => {
  console.log(`dev-server: http://localhost:${PORT}  (POST /analyze, GET /sites/<slug>/scene.json)`);
});
