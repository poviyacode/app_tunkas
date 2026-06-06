import { Injectable } from '@angular/core';
import { Chat } from '@interfaces/chat';
import { Message } from '@interfaces/message';
import Dexie, { Table } from 'dexie';

@Injectable({ providedIn: 'root' })
export class MessageStorageService extends Dexie {
  //messages!: Dexie.Table<Message, number>;
  // messages!: Dexie.Table<{
  //   id?: number;
  //   Chat?: Chat;
  //   message?: string;
  //   createdAt?: number;
  // }, number>;

  //constructor() {
    // super('PoviyaDB');
    // this.version(1).stores({
    //   //messages: '++id, Chat._id, message, createdAt',
    //   messages: '++id, &_id, Chat._id, message, createdAt' // & = clave primaria
    // });
    // this.messages = this.table('messages');
  //}

  async addMessage(message: Message) {
    //await this.messages.put(message);
  }

  async deleteMessage(messageId: number) {
    //await this.messages.delete(messageId);
  }

  async getMessagesByChat(idChat: string) {
    //return this.messages.where('Chat._id').equals(idChat).toArray();
  }

  async clearMessages() {
    //await this.messages.clear();
  }
}