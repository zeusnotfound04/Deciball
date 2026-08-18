import { Client, IntentsBitField, Events } from "discord.js";
import dotenv from "dotenv";
import { CommandHandler } from "./handlers/commandHandler";
import { SpaceManager } from "./services/SpaceManager";

dotenv.config();

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is required in environment variables");
  process.exit(1);
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent, // Required for reading message content
    IntentsBitField.Flags.GuildVoiceStates, // Required for voice functionality
  ]
});

const commandHandler = new CommandHandler(client);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Discord bot is ready! Logged in as ${readyClient.user.tag}`);
  
  // Initialize SpaceManager
  try {
    await SpaceManager.getInstance().initialize();
    console.log("SpaceManager initialized successfully");
  } catch (error) {
    console.error("Failed to initialize SpaceManager:", error);
  }
  
  // Load and register commands
  await commandHandler.loadCommands();
  console.log("Bot is fully operational!");
});
client.on(Events.InteractionCreate, async (interaction) => {
  await commandHandler.handleInteraction(interaction);
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.on(Events.Warn, (warning) => {
  console.warn("Discord client warning:", warning);
});

client.login(process.env.DISCORD_TOKEN);

process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT, shutting down gracefully...");
  
  // Shutdown SpaceManager
  try {
    await SpaceManager.getInstance().shutdown();
    console.log("SpaceManager shutdown complete");
  } catch (error) {
    console.error("Error during SpaceManager shutdown:", error);
  }
  
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM, shutting down gracefully...");
  
  // Shutdown SpaceManager
  try {
    await SpaceManager.getInstance().shutdown();
    console.log("SpaceManager shutdown complete");
  } catch (error) {
    console.error("Error during SpaceManager shutdown:", error);
  }
  
  client.destroy();
  process.exit(0);
});
