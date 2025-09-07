import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("test-autocomplete")
  .setDescription("Test autocomplete functionality")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("Type something to see autocomplete")
      .setRequired(true)
      .setAutocomplete(true)
  ) as SlashCommandBuilder;

export async function execute(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString("query", true);
  
  await interaction.reply({
    content: `✅ You selected: "${query}"`,
    ephemeral: true
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedValue = interaction.options.getFocused();
    
    // Simple test autocomplete with static suggestions
    const suggestions = [
      "Test Option 1",
      "Test Option 2", 
      "Another suggestion",
      "Sample text",
      "Example choice"
    ];
    
    const filtered = suggestions
      .filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25) // Discord allows max 25 choices
      .map(choice => ({
        name: choice,
        value: choice
      }));

    await interaction.respond(filtered);
  } catch (error) {
    console.error('Error in test autocomplete:', error);
    await interaction.respond([]);
  }
}
