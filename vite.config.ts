import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Os testes de App montam o app inteiro no jsdom; com um worker por núcleo, a disputa de CPU
    // estoura o timeout de 5 s. Metade dos núcleos mantém a suíte estável (decisão do usuário).
    maxWorkers: '50%',
  },
})
