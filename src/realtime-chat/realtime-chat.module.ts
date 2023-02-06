import { Module } from '@nestjs/common';
import { WebSocketsController } from './realtime-chat.controller';

@Module({
    providers: [WebSocketsController],
})
export class WebSocketsModule {}