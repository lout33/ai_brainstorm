import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Use terser for better minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true
      }
    },
    
    // Generate source maps for production debugging
    sourcemap: true,
    
    // Target modern browsers for smaller bundle
    target: 'es2020',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor code for better caching
          'openrouter': ['./src/openrouter-client.js'],
          'conversation': ['./src/conversation-manager.js', './src/conversation-tree-ui.js'],
          'agent': ['./src/agent-orchestrator.js']
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Server configuration for development
  server: {
    port: 3000,
    open: true
  },
  
  // Preview server configuration
  preview: {
    port: 4173
  }
});
