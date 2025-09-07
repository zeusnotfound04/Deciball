import { Collection, Client, REST, Routes, ChatInputCommandInteraction, SlashCommandBuilder, Interaction } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

interface Command {
  command: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class CommandHandler {
  public commands: Collection<string, Command>;
  private client: Client;
  private rest: REST;

  constructor(client: Client) {
    this.client = client;
    this.commands = new Collection();
    this.rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  }

  async loadCommands(): Promise<void> {
    const commandsPath = join(__dirname, "..", "commands");
    
    try {
      const commandFiles = readdirSync(commandsPath).filter(file => 
        file.endsWith(".ts") || file.endsWith(".js")
      );

      const commands = [];

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const commandModule = await import(filePath);
        
        if ("command" in commandModule && "execute" in commandModule) {
          const commandName = commandModule.command.name;
          this.commands.set(commandName, commandModule);
          commands.push(commandModule.command.toJSON());
          console.log(` Loaded command: ${commandName}`);
        } else {
          console.warn(` Command at ${filePath} is missing required "command" or "execute" export`);
        }
      }

      await this.registerCommands(commands);
    } catch (error) {
      console.error(" Error loading commands:", error);
    }
  }

  private async registerCommands(commands: any[]): Promise<void> {
    try {
      console.log(` Started registering ${commands.length} application (/) commands.`);

      // Register commands globally (for all guilds)
      await this.rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands }
      );

      console.log(` Successfully registered ${commands.length} application (/) commands.`);
    } catch (error) {
      console.error(" Error registering commands:", error);
    }
  }

  async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) {
      console.error(` No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(" Error executing command:", error);
      
      const errorMessage = "There was an error while executing this command!";
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
}
