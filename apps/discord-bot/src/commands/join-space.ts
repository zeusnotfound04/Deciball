import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { MusicManager } from "../services/MusicManager";
import { SpaceManager } from "../services/SpaceManager";

export const command: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName("join-space")
  .setDescription("Join a Deciball space and sync music playback")
  .addStringOption(option =>
    option.setName("space-id")
      .setDescription("The ID of the space to join")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const spaceId = interaction.options.getString("space-id", true);
    const member = interaction.member as GuildMember;
    
    if (!member?.voice?.channel) {
      await interaction.reply({
        content: "❌ You need to be in a voice channel to join a space!",
        ephemeral: true
      });
      return;
    }

    // Check if bot is already connected to a space
    const spaceManager = SpaceManager.getInstance();
    const currentSpace = spaceManager.getSpaceForGuild(interaction.guildId!);
    
    if (currentSpace) {
      await interaction.reply({
        content: `❌ This server is already connected to space: \`${currentSpace}\`\nUse \`/exit-space\` first to leave the current space.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Get or create music player
      const musicManager = MusicManager.getInstance();
      const player = musicManager.getPlayer(interaction.guildId!);
      
      // Connect to voice channel
      const connected = await player.connect(member.voice.channel);
      if (!connected) {
        await interaction.editReply({
          content: "❌ Failed to connect to voice channel!"
        });
        return;
      }

      // Join the space
      await spaceManager.joinSpace(spaceId, interaction.guildId!, player);

      const embed = {
        color: 0x1db954,
        title: "🎵 Space Connected!",
        description: `Successfully joined space: \`${spaceId}\``,
        fields: [
          {
            name: "Voice Channel",
            value: member.voice.channel.name,
            inline: true
          },
          {
            name: "Status",
            value: "Syncing with space...",
            inline: true
          }
        ],
        footer: {
          text: "The bot will now play music in sync with the space"
        },
        timestamp: new Date().toISOString()
      };

      await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
      console.error("Error joining space:", error);
      
      let errorMessage = "❌ Failed to join space!";
      if (error.message) {
        if (error.message.includes("already connected")) {
          errorMessage = "❌ This server is already connected to a space!";
        } else if (error.message.includes("not found")) {
          errorMessage = "❌ Space not found! Please check the space ID.";
        }
      }

      await interaction.editReply({
        content: errorMessage
      });
    }

  } catch (error) {
    console.error("Error in join-space command:", error);
    
    const errorResponse = {
      content: "❌ An error occurred while joining the space.",
      ephemeral: true
    };

    if (interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}
