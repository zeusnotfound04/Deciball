import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume the currently paused music");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if user is in a voice channel
    const member = interaction.member as GuildMember;
    if (!member?.voice?.channel) {
      await interaction.reply({
        content: "❌ You need to be in a voice channel to control music!",
        ephemeral: true
      });
      return;
    }

    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);

    // Check if bot is connected
    if (!player.isConnected()) {
      await interaction.reply({
        content: "❌ I'm not connected to any voice channel!",
        ephemeral: true
      });
      return;
    }

    // Check if music is paused
    const status = player.getStatus();
    if (!status.isPaused) {
      await interaction.reply({
        content: "❌ Music is not paused!",
        ephemeral: true
      });
      return;
    }

    // Resume the music
    const resumed = player.resume();
    
    if (resumed) {
      const currentTrack = player.getCurrentTrack();
      const embed: any = {
        color: 0x1db954,
        title: "▶️ Music Resumed",
        description: currentTrack 
          ? `**${currentTrack.title}**\nby ${currentTrack.artist}`
          : "Resumed playback",
        timestamp: new Date().toISOString()
      };

      // Only add thumbnail if it exists
      if (currentTrack?.thumbnail) {
        embed.thumbnail = { url: currentTrack.thumbnail };
      }

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({
        content: "❌ Failed to resume music!",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("Error in resume command:", error);
    await interaction.reply({
      content: "❌ An error occurred while trying to resume music.",
      ephemeral: true
    });
  }
}
