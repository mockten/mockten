import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';
  return {
    server: {
      allowedHosts: ['nginx', 'localhost'],
      watch: {
        ignored: ['**/test-results/**', '**/playwright-report/**']
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'test-helpers',
        configureServer(server) {
          if (!isTestMode) return;

          // Reset stock + wishlist for E2E tests (runs on host, has Docker access)
          server.middlewares.use('/api/test/reset-stock', async (_req, res) => {
            try {
              const { execSync } = await import('child_process');
              execSync(
                `docker exec -i mysql-service.default.svc.cluster.local mysql --ssl-mode=DISABLED -umocktenusr -pmocktenpassword mocktendb -e "UPDATE Stock SET stocks = 10 WHERE product_id = 'b91a5d68-6acb-48e7-8e5d-3d85b7e76af2'; DELETE FROM Wishlist;"`,
                { timeout: 10000 }
              );
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });

          server.middlewares.use('/api/test/auth-backdoor', async (req, res) => {
            try {
              const url = new URL(req.url || '', 'http://localhost');
              const username = url.searchParams.get('username') || 'superadmin';
              let password = url.searchParams.get('password');
              if (!password) {
                if (username.startsWith('dev_user_')) {
                  const match = username.match(/\d+/);
                  const num = match ? match[0] : '001';
                  password = `devpass${num}`;
                } else {
                  password = username;
                }
              }

              // Call API Gateway to get the token, which proxies to Keycloak
              const tokenRes = await fetch('http://localhost:8082/api/uam/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  username,
                  password,
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
