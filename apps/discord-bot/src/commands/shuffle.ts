import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("shuffle")
  .setDescription("Shuffle the music queue");

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
    
    if (queueLength < 2) {
      await interaction.reply({
        content: "❌ Need at least 2 songs in queue to shuffle!",
        ephemeral: true
      });
      return;
    }

    player.shuffleQueue();
    
    const embed = {
      color: 0x9b59b6,
      title: "🔀 Queue Shuffled",
      description: `Shuffled ${queueLength} song${queueLength === 1 ? '' : 's'} in the queue`,
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in shuffle command:", error);
    await interaction.reply({
      content: "❌ An error occurred while shuffling the queue.",
      ephemeral: true
    });
  }
}
