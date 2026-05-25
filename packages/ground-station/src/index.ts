import { loadEspressoEnv } from "@espresso/core";
import { serve } from "@hono/node-server";
import { createApp, recoverQueuedSubmissions } from "./app.js";
import { startSerialIngest } from "./serial.js";

const env = loadEspressoEnv();
const app = createApp(env);
startSerialIngest(env);

if (env.GROUND_STATION_PRIVATE_KEY) {
  recoverQueuedSubmissions(env)
    .then((restored) => {
      if (restored.length > 0) console.log(`Recovered ${restored.length} queued submission(s) from Arkiv`);
    })
    .catch((error) => console.error("Queue recovery from Arkiv failed", error));
}

serve(
  {
    fetch: app.fetch,
    port: env.GROUND_STATION_PORT,
  },
  (info) => {
    console.log(`Espresso ground station listening on http://localhost:${info.port}`);
  },
);
