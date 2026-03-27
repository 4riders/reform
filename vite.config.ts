/// <reference types="vitest/config" />
import { resolve } from "path";
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import dts from "vite-plugin-dts"

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "./src/index.ts"),
            name: "@4riders/reform",
            fileName: (format) => `index.${format}.js`,
            formats: ["es"],
            
        },
        rolldownOptions: {
            external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
        },
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [
        react(),
        babel({
            plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]]
        }),
        dts({ rollupTypes: true })
    ],
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.ts?(x)'],
    },
})