import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop the music and clear the queue");

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
    player.stop();
    player.disconnect();
    musicManager.removePlayer(interaction.guildId!);

    await interaction.reply("⏹️ Music stopped and queue cleared!");

  } catch (error) {
    console.error("Error in stop command:", error);
    await interaction.reply({
      content: "❌ An error occurred while stopping the music.",
      ephemeral: true
    });
  }
}
