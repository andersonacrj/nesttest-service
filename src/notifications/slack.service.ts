import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { cfg } from '../config/config';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly client = new WebClient(cfg().slackBotToken);
  private readonly channel = cfg().slackChannelId;

  async notify(text: string) {
    const res = await this.client.chat.postMessage({
      channel: this.channel,
      text,
    });
    this.logger.log(`Slack ts=${(res as any).ts}`);
    return (res as any).ts ?? '';
  }
}
