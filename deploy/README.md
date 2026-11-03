# Developer Zone VPS deployment

Build the app with `pnpm install --frozen-lockfile && pnpm build`, then copy the service files into `/etc/systemd/system/`.

Create a dedicated service user and keep runtime secrets outside the repository:

```bash
sudo useradd --system --home /var/lib/developer-zone --shell /usr/sbin/nologin developer-zone
sudo install -d -o developer-zone -g developer-zone -m 700 /etc/developer-zone/secrets
sudo install -o developer-zone -g developer-zone -m 600 /dev/null /etc/developer-zone/secrets/telegram-token
sudo install -o developer-zone -g developer-zone -m 600 /dev/null /etc/developer-zone/secrets/telegram-chat-id
sudo systemctl daemon-reload
sudo systemctl enable --now developer-zone-web developer-zone-autolikes
sudo journalctl -u developer-zone-web -f
```

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_SITE_URL` in `/etc/developer-zone/web.env`. Put Nginx in front of port 3000 and obtain TLS with your approved certificate provider.

The worker scaffold is intentionally independent from the web process. Before production use, connect its checkpoint loop to the existing AutoLikes execution service and database lock protocol; do not run it against real providers until that verification is complete.
