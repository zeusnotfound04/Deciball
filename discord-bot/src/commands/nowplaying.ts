import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("nowplaying")
  .setDescription("Show information about the currently playing song");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const musicManager = MusicManager.getInstance();
    
    if (!musicManager.hasPlayer(interaction.guildId!)) {
      await interaction.reply({
        content: "❌ No music is currently playing!",
        ephemeral: true
      });
      return;
    }

    const player = musicManager.getPlayer(interaction.guildId!);
    const currentTrack = player.getCurrentTrack();
    const status = player.getStatus();
    
    if (!currentTrack) {
      await interaction.reply({
        content: "❌ No song is currently playing!",
        ephemeral: true
      });
      return;
    }

    let statusIcon = "🎵";
    let statusText = "Playing";
    
    if (status.isPaused) {
      statusIcon = "⏸️";
      statusText = "Paused";
    }

    const embed: any = {
      color: 0x1db954,
      title: `${statusIcon} Now Playing`,
      description: `**${currentTrack.title}**\nby ${currentTrack.artist}`,
      fields: [
        {
          name: "Duration",
          value: currentTrack.duration,
          inline: true
        },
        {
          name: "Requested by",
          value: currentTrack.requestedBy,
          inline: true
        },
        {
          name: "Status",
          value: statusText,
          inline: true
        },
        {
          name: "Volume",
          value: `${Math.round(status.volume * 100)}%`,
          inline: true
        },
        {
          name: "Queue",
          value: `${status.queueLength} song${status.queueLength === 1 ? '' : 's'} remaining`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Only add thumbnail if it exists
    if (currentTrack.thumbnail) {
      embed.thumbnail = { url: currentTrack.thumbnail };
    }

    // Add source information if available
    if (currentTrack.spotifyData) {
      embed.fields?.push({
        name: "Source",
        value: "🎵 Spotify → 📺 YouTube",
        inline: true
      });
    } else if (currentTrack.youtubeData) {
      embed.fields?.push({
        name: "Source",
        value: "📺 YouTube",
        inline: true
      });
    }

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in nowplaying command:", error);
    await interaction.reply({
      content: "❌ An error occurred while fetching current song info.",
      ephemeral: true
    });
  }
}
