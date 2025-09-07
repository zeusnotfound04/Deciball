import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { YouTubeService } from "../services/YouTubeService";

export const command = new SlashCommandBuilder()
  .setName("debug-youtube")
  .setDescription("Debug YouTube search functionality")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("Search query to test")
      .setRequired(true)
  ) as SlashCommandBuilder;

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const query = interaction.options.getString("query", true);
    
    await interaction.deferReply({ ephemeral: true });
    
    const youtubeService = new YouTubeService();
    
    // Test the raw API first
    console.log(`🧪 Testing YouTube API for: "${query}"`);
    const rawResult = await youtubeService.testYouTubeAPI(query);
    
    // Test the search method
    const searchResult = await youtubeService.searchTrack(query);
    
    let response = `**YouTube API Debug Results for:** \`${query}\`\n\n`;
    
    if (rawResult) {
      response += `✅ **Raw API Response:** Success\n`;
      response += `📊 **Items found:** ${rawResult.items?.length || 0}\n\n`;
      
      if (rawResult.items?.length > 0) {
        response += `**First 3 raw results:**\n`;
        rawResult.items.slice(0, 3).forEach((item: any, index: number) => {
          response += `${index + 1}. **${item.title || 'No title'}**\n`;
          response += `   - ID: \`${item.id || 'No ID'}\`\n`;
          response += `   - Type: ${item.type || 'Unknown'}\n`;
          response += `   - Channel: ${item.channelTitle || 'Unknown'}\n`;
          response += `   - Duration: ${item.length?.simpleText || 'Unknown'}\n\n`;
        });
      }
    } else {
      response += `❌ **Raw API Response:** Failed\n\n`;
    }
    
    if (searchResult) {
      response += `✅ **Parsed Search Result:** Success\n`;
      response += `🎵 **Title:** ${searchResult.title}\n`;
      response += `👤 **Channel:** ${searchResult.channelTitle}\n`;
      response += `⏱️ **Duration:** ${searchResult.duration}\n`;
      response += `🔗 **URL:** ${searchResult.url}\n`;
    } else {
      response += `❌ **Parsed Search Result:** Failed\n`;
    }
    
    // Truncate response if too long
    if (response.length > 2000) {
      response = response.substring(0, 1950) + '\n\n... (truncated)';
    }
    
    await interaction.editReply(response);
    
  } catch (error) {
    console.error("Error in debug-youtube command:", error);
    
    const errorMessage = `❌ Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
