import { Collection } from 'discord.js';
import { MusicPlayer } from './MusicPlayer';

export class MusicManager {
  private static instance: MusicManager;
  private players: Collection<string, MusicPlayer>;

  private constructor() {
    this.players = new Collection();
  }

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  getPlayer(guildId: string): MusicPlayer {
    let player = this.players.get(guildId);
    if (!player) {
      player = new MusicPlayer(guildId);
      this.players.set(guildId, player);
    }
    return player;
  }

  removePlayer(guildId: string): void {
    const player = this.players.get(guildId);
    if (player) {
      player.disconnect();
      this.players.delete(guildId);
    }
  }

  hasPlayer(guildId: string): boolean {
    return this.players.has(guildId);
  }

  getAllPlayers(): Collection<string, MusicPlayer> {
    return this.players;
  }

  disconnectAll(): void {
    this.players.forEach(player => player.disconnect());
    this.players.clear();
  }
}
