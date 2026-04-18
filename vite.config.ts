/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from "node:path";
import { defineConfig, esmExternalRequirePlugin } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(import.meta.dirname, "./src/index.ts"),
            name: "Reform",
            fileName: "index",
        },
        rolldownOptions: {
            // external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
            output: {
                globals: {
                    react: "React",
                    "react/jsx-runtime": "ReactJSXRuntime",
                    "react-dom": "ReactDOM",
                    "react-dom/server": "ReactDOMServer"
                },
            },
        },
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [
        react(),
        babel({
            presets: [reactCompilerPreset()],
            plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]]
        }),
        dts({ rollupTypes: true }),
        esmExternalRequirePlugin({
            external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
        }),
    ],
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.ts?(x)'],
    },
})