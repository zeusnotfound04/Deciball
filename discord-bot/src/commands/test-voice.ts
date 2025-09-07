import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("test-voice")
  .setDescription("Test voice connection without playing anything");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if user is in a voice channel
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) {
      await interaction.reply({
        content: "❌ You need to be in a voice channel to test voice connection!",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);

    console.log(`Testing voice connection to: ${member.voice.channel.name}`);
    
    const connected = await player.connect(member.voice.channel as any);
    
    if (connected) {
      await interaction.editReply("✅ Voice connection test successful! Bot can connect to voice channels.");
      
      // Disconnect after 10 seconds
      setTimeout(() => {
        player.disconnect();
        console.log("🔌 Test voice connection closed");
      }, 10000);
    } else {
      await interaction.editReply("❌ Voice connection test failed! Check console for details.");
    }

  } catch (error) {
    console.error("Error in test-voice command:", error);
    
    const errorMessage = "❌ An error occurred during voice connection test.";
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
