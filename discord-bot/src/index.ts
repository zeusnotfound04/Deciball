import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { CommandHandler } from "./handlers/commandHandler";

dotenv.config();

if (!process.env.DISCORD_TOKEN) {
  console.error(" DISCORD_TOKEN is required in environment variables");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for reading message content
  ]
});

const commandHandler = new CommandHandler(client);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(` Discord bot is ready! Logged in as ${readyClient.user.tag}`);
  
  // Load and register commands
  await commandHandler.loadCommands();
  console.log(" Bot is fully operational!");
});
client.on(Events.InteractionCreate, async (interaction) => {
  await commandHandler.handleInteraction(interaction);
});

client.on(Events.Error, (error) => {
  console.error(" Discord client error:", error);
});

client.on(Events.Warn, (warning) => {
  console.warn(" Discord client warning:", warning);
});

client.login(process.env.DISCORD_TOKEN);

process.on("SIGINT", () => {
  console.log("\n Received SIGINT, shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n Received SIGTERM, shutting down gracefully...");
  client.destroy();
  process.exit(0);
});
