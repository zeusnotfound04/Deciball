import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause or resume the current song");

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
    const status = player.getStatus();

    if (!status.currentTrack) {
      await interaction.reply({
        content: "❌ No song is currently playing!",
        ephemeral: true
      });
      return;
    }

    if (status.isPlaying) {
      const paused = player.pause();
      if (paused) {
        await interaction.reply("⏸️ Music paused!");
      } else {
        await interaction.reply({
          content: "❌ Failed to pause the music.",
          ephemeral: true
        });
      }
    } else if (status.isPaused) {
      const resumed = player.resume();
      if (resumed) {
        await interaction.reply("▶️ Music resumed!");
      } else {
        await interaction.reply({
          content: "❌ Failed to resume the music.",
          ephemeral: true
        });
      }
    } else {
      await interaction.reply({
        content: "❌ No music is currently playing or paused.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("Error in pause command:", error);
    await interaction.reply({
      content: "❌ An error occurred while pausing/resuming the music.",
      ephemeral: true
    });
  }
}
