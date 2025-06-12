# Avalanche Token Launch Monitor

This project tracks token creation transactions on StarsArena's Arena Launch contract on Avalanche. It stores token and creator information in Supabase and can automatically post updates to StarsArena and Discord. The UI is a Next.js application with real‑time monitoring and debugging tools.

## Environment Variables
Create a `.env.local` file in the project root and provide the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional API key for arena.trade profile lookups
ARENA_API_KEY=your-arena-api-key

# Bearer token used to post to StarsArena
ARENA_BEARER_TOKEN=your-starsarena-bearer-token

# Discord webhook URLs
DISCORD_WEBHOOK_CHAMPIONS=your-discord-webhook-for-champions
DISCORD_WEBHOOK_HEAVY_HITTERS=your-discord-webhook-for-heavy-hitters
DISCORD_WEBHOOK_GENERAL=your-discord-webhook-for-general-posts
```

## Supabase Setup
1. Create a new Supabase project.
2. Execute the SQL scripts in the `scripts/` folder to create the required tables:
   - `create-tables.sql`
   - `create-creators-table.sql`
   - `fix-duplicate-tickers.sql` (optional maintenance script)
3. Copy the project URL and anon key into the environment variables above.

## Running the App
Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` to view the dashboard. The **Real‑time Monitoring** card lets you start or stop scanning blocks.

## Monitoring & Posting
- When monitoring is active, new token creation transactions appear in the **Token Creations** tab.
- If `ARENA_BEARER_TOKEN` and the Discord webhook variables are set, the backend will automatically post champion or heavy‑hitter launches to StarsArena and Discord.
- Use the debug tabs in the UI to test API connectivity and profile lookups.

