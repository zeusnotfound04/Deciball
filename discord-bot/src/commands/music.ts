import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Show music bot help and commands");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = {
    color: 0x1db954,
    title: "🎵 Music Bot Commands",
    description: "Welcome to the Deciball Music Bot! Here are all available commands:",
    fields: [
      {
        name: "🎵 `/play <song>`",
        value: "Play a song from Spotify. The bot will search for the song and play it from YouTube.",
        inline: false
      },
      {
        name: "🔍 `/search <song>`",
        value: "Search for songs on Spotify and choose which one to play from a list.",
        inline: false
      },
      {
        name: "⏸️ `/pause`",
        value: "Pause or resume the current song.",
        inline: false
      },
      {
        name: "⏭️ `/skip`",
        value: "Skip the current song and play the next one in queue.",
        inline: false
      },
      {
        name: "📝 `/queue`",
        value: "Show the current music queue with upcoming songs.",
        inline: false
      },
      {
        name: "⏹️ `/stop`",
        value: "Stop the music completely and clear the queue.",
        inline: false
      },
      {
        name: "🏓 `/ping`",
        value: "Check if the bot is responsive.",
        inline: false
      },
      {
        name: "👋 `/hello`",
        value: "Say hello to the bot.",
        inline: false
      },
      {
        name: "ℹ️ `/userinfo [user]`",
        value: "Get information about yourself or another user.",
        inline: false
      }
    ],
    footer: {
      text: "💡 Tip: You need to be in a voice channel to use music commands!"
    },
    timestamp: new Date().toISOString()
  };

  await interaction.reply({ embeds: [embed] });
}
