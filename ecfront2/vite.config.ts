import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'auth-backdoor',
        configureServer(server) {
          if (!isTestMode) return;
          server.middlewares.use('/api/test/auth-backdoor', async (req, res) => {
            try {
              // Call API Gateway to get the token, which proxies to Keycloak
              const tokenRes = await fetch('http://localhost:8082/api/uam/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  username: 'superadmin',
                  password: 'superadmin',
                })
              });

              const data = await tokenRes.json();

              if (!tokenRes.ok) {
                res.statusCode = tokenRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: "Failed to fetch token", details: data }));
                return;
              }

              // Return an HTML page that sets localStorage and Cookie, then redirects
              const html = `
                <html>
                  <body>
                    <p>Logging in as test user...</p>
                    <script>
                      localStorage.setItem('access_token', '${data.access_token || data.accessToken || ''}');
                      localStorage.setItem('refresh_token', '${data.refresh_token || data.refreshToken || ''}');
                      document.cookie = "access_token=${data.access_token || data.accessToken || ''}; path=/";
                      document.cookie = "refresh_token=${data.refresh_token || data.refreshToken || ''}; path=/";
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 100);
                    </script>
                  </body>
                </html>
              `;

              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            } catch (err) {
              res.statusCode = 500;
              res.end(String(err));
            }
          });
        }
      }
    ],
  };
});
