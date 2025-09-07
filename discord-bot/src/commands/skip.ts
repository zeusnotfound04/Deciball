import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current song");

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
    
    if (!currentTrack) {
      await interaction.reply({
        content: "❌ No song is currently playing!",
        ephemeral: true
      });
      return;
    }

    const skipped = player.skip();
    
    if (skipped) {
      await interaction.reply(`⏭️ Skipped: **${currentTrack.title}** by ${currentTrack.artist}`);
    } else {
      await interaction.reply({
        content: "❌ Failed to skip the current song.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("Error in skip command:", error);
    await interaction.reply({
      content: "❌ An error occurred while skipping the song.",
      ephemeral: true
    });
  }
}
