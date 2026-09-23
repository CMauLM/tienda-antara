import mongoose from 'mongoose';

// DB_ENV="test" activa MONGODB_URI_TEST (ej. antara-tienda-test). Cualquier
// otro valor (incluido no tenerla definida) usa MONGODB_URI normal: el
// default sin configurar nada es SIEMPRE producción. En Netlify nunca se
// define DB_ENV, así que producción no se ve afectada por esto.
const usarTest = process.env.DB_ENV === 'test';

const MONGODB_URI = usarTest ? process.env.MONGODB_URI_TEST : process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    usarTest
      ? 'DB_ENV=test pero falta MONGODB_URI_TEST en las variables de entorno (.env.local)'
      : 'Define MONGODB_URI en las variables de entorno (.env.local)'
  );
}

// Cache de conexión para evitar abrir múltiples conexiones durante el
// hot-reload de Next.js en desarrollo.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false }).then((m) => {
      const nombreDb = m.connection.db?.databaseName ?? '?';
      console.log(`[db] Conectado a "${nombreDb}" (${usarTest ? 'PRUEBAS' : 'PRODUCCIÓN'})`);
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
