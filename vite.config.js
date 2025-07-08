import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // fast TS/JSX compiler

export default defineConfig({
  plugins: [react()]
});
