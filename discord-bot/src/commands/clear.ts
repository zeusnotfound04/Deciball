import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Clear the music queue");

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
    
    if (!musicManager.hasPlayer(interaction.guildId!)) {
      await interaction.reply({
        content: "❌ No music is currently playing!",
        ephemeral: true
      });
      return;
    }

    const player = musicManager.getPlayer(interaction.guildId!);
    const queueLength = player.getQueue().length;
    
    if (queueLength === 0) {
      await interaction.reply({
        content: "📭 The queue is already empty!",
        ephemeral: true
      });
      return;
    }

    player.clearQueue();
    
    const embed = {
      color: 0xff6b35,
      title: "🗑️ Queue Cleared",
      description: `Removed ${queueLength} song${queueLength === 1 ? '' : 's'} from the queue`,
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in clear command:", error);
    await interaction.reply({
      content: "❌ An error occurred while clearing the queue.",
      ephemeral: true
    });
  }
}
