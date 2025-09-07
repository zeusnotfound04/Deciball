import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("volume")
  .setDescription("Adjust the music volume")
  .addIntegerOption(option =>
    option
      .setName("level")
      .setDescription("Volume level (0-100)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100)
  ) as SlashCommandBuilder;

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

    const volumeLevel = interaction.options.getInteger("level", true);
    const player = musicManager.getPlayer(interaction.guildId!);
    
    const volumeFloat = volumeLevel / 100; // Convert to 0-1 range
    player.setVolume(volumeFloat);
    
    let volumeEmoji = "🔇";
    if (volumeLevel > 0 && volumeLevel <= 30) volumeEmoji = "🔈";
    else if (volumeLevel > 30 && volumeLevel <= 70) volumeEmoji = "🔉";
    else if (volumeLevel > 70) volumeEmoji = "🔊";
    
    const embed = {
      color: 0x3498db,
      title: `${volumeEmoji} Volume Adjusted`,
      description: `Volume set to **${volumeLevel}%**`,
      fields: [
        {
          name: "Volume Bar",
          value: createVolumeBar(volumeLevel),
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in volume command:", error);
    await interaction.reply({
      content: "❌ An error occurred while adjusting volume.",
      ephemeral: true
    });
  }
}

function createVolumeBar(volume: number): string {
  const totalBars = 20;
  const filledBars = Math.round((volume / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${volume}%`;
}
