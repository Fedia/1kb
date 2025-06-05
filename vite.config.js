import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/api/generate-survey') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                id: 'survey_' + Date.now(),
                questions: [
                  {
                    id: 'q1',
                    type: 'multiple_choice',
                    text: 'How satisfied are you with our service?',
                    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']
                  },
                  {
                    id: 'q2',
                    type: 'text',
                    text: 'What improvements would you suggest for our service?'
                  },
                  {
                    id: 'q3',
                    type: 'rating',
                    text: 'How likely are you to recommend us to others? (1-5)'
                  }
                ]
              }));
            } else if (req.url === '/api/save-response') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                console.log('Received survey response:', JSON.parse(body));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              });
            }
          });
        }
      }
    }
  }
});