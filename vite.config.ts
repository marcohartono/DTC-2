import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // basicSsl serves the dev/preview server over HTTPS (self-signed) so phone
  // browsers will run geolocation — navigator.geolocation needs a secure
  // context, which a plain http://<LAN-IP> dev URL is not.
  plugins: [react(), basicSsl()],
  server: { port: 5173, host: true },
});
